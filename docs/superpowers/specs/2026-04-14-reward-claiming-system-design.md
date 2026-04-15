# Reward Claiming System — Design Spec
**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** Member claim receipt + Organizer verification UI + Approval/Refund workflow + Notifications

---

## Context

The current rewards system allows members to redeem rewards (deducting points via `redeem_reward` RPC), but has no verification workflow. Organizers have no way to confirm a member physically received a reward, and there is no refund mechanism if a reward cannot be fulfilled. This spec defines the end-to-end claiming system that closes that gap.

---

## Architecture

### Approach: RPC-driven state transitions
All claim status changes (approve, refund) are executed via Supabase RPCs with server-side guard logic. The client never directly `UPDATE`s `reward_redemptions.status`. This ensures:
- Atomic transactions (points restored in same DB transaction as status update)
- Server-side constraint: refund is blocked once status is `'claimed'`
- Matches existing pattern (`approve_volunteer_application` RPC)

---

## 1. Database Changes

### Migration file: `supabase/migrations/YYYYMMDD_reward_claim_workflow.sql`

```sql
-- 1. Extend status check constraint to include 'cancelled'
ALTER TABLE reward_redemptions
  DROP CONSTRAINT IF EXISTS reward_redemptions_status_check,
  ADD CONSTRAINT reward_redemptions_status_check
    CHECK (status IN ('pending', 'claimed', 'cancelled'));

-- 2. Add organizer audit columns
ALTER TABLE reward_redemptions
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 3. RPC: approve_reward_claim
CREATE OR REPLACE FUNCTION approve_reward_claim(
  p_redemption_id uuid,
  p_organizer_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_redemption reward_redemptions%ROWTYPE;
BEGIN
  SELECT * INTO v_redemption FROM reward_redemptions WHERE id = p_redemption_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  IF v_redemption.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim is not in pending state');
  END IF;

  UPDATE reward_redemptions SET
    status = 'claimed',
    claimed_at = now(),
    reviewed_by = p_organizer_id,
    reviewed_at = now()
  WHERE id = p_redemption_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. RPC: refund_reward_claim
CREATE OR REPLACE FUNCTION refund_reward_claim(
  p_redemption_id uuid,
  p_organizer_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_redemption reward_redemptions%ROWTYPE;
  v_points_cost integer;
  v_ref text;
BEGIN
  SELECT * INTO v_redemption FROM reward_redemptions WHERE id = p_redemption_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  -- Hard guard: cannot refund an approved claim
  IF v_redemption.status = 'claimed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refund an already approved claim');
  END IF;

  IF v_redemption.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim already cancelled');
  END IF;

  -- Get reward points cost
  SELECT points_cost INTO v_points_cost FROM rewards WHERE id = v_redemption.reward_id;

  -- Generate transaction ref
  v_ref := upper(substring(gen_random_uuid()::text, 1, 8));

  -- Restore points
  INSERT INTO point_transactions (user_id, amount, description, source, transaction_ref)
  VALUES (
    v_redemption.user_id,
    v_points_cost,
    'Reward refund: ' || (SELECT name FROM rewards WHERE id = v_redemption.reward_id),
    'redemption',
    v_ref
  );

  UPDATE profiles SET
    spendable_points = spendable_points + v_points_cost
  WHERE id = v_redemption.user_id;

  UPDATE reward_redemptions SET
    status = 'cancelled',
    reviewed_by = p_organizer_id,
    reviewed_at = now()
  WHERE id = p_redemption_id;

  RETURN jsonb_build_object('success', true, 'points_restored', v_points_cost);
END;
$$;
```

### State machine
```
pending → claimed    (approve_reward_claim)   TERMINAL — no further transitions
pending → cancelled  (refund_reward_claim)    TERMINAL — no further transitions
claimed → cancelled  BLOCKED by RPC guard
```

---

## 2. Member UI

### Files modified
- `apps/member/src/pages/rewards/Rewards.tsx`

### Post-redeem Success State (inside `RedemptionModal`)
After swipe confirmation, the success screen renders a **Claim Receipt card**:
- Reward name + image at top
- `<QRCodeSVG>` (from `qrcode.react`) encoding the `redemption.id`
- Claim ID: `CLM-` + first 8 chars of redemption UUID (uppercased)
- `StatusPill` with `'pending'` → label: "Awaiting Verification" (amber)
- Instruction text: *"Show this to an organizer at the rewards booth"*
- Styled to match `EventTicket` screen conventions

### Claim Receipts Tab (enhanced)
Each row gains a richer status badge via `StatusPill`:

| Status | Color | Label |
|--------|-------|-------|
| `pending` | amber | Awaiting Verification |
| `claimed` | green | Verified |
| `cancelled` | red | Refunded |

Tapping a `pending` receipt opens a **read-only bottom sheet** showing the QR + claim ID (so the user can retrieve the receipt without re-redeeming).

### Points deduction
Unchanged — happens at redeem time via existing `redeem_reward` RPC.

---

## 3. Organizer Claims Tab

### Files modified
- `apps/member/src/pages/organizer/rewards/RewardsManagement.tsx`

### Tab bar
```
[ Rewards ]  [ Claims (N) ]
```
Badge count = `pendingClaims.length`. Updates live via realtime.

### Claims Tab Layout
Each pending claim rendered as a card (styled like `ApprovalCard`):
- Member avatar initials + full name
- Reward name + image thumbnail
- Points cost (e.g. `500 pts`)
- Redeemed timestamp via `formatDate.compact()`
- Claim ID (`CLM-XXXXXXXX`)
- **Approve button** (green, `CheckCircleOutline`) → calls `approve_reward_claim` RPC
- **Refund button** (red, `CloseCircleOutline`) → opens confirmation sheet → calls `refund_reward_claim` RPC

### Refund Confirmation Sheet
- Text: *"Are you sure? This will restore [N] pts to [Member Name]."*
- Confirm / Cancel buttons
- On confirm: RPC called, card moves to Resolved section

### Resolved Section
Approved + cancelled claims appear in a collapsible "Resolved" section below the pending list. Pending claims are always visually prioritized at top.

### State guard
Approve/Refund buttons are not rendered for non-`pending` cards (client-side). RPC enforces server-side.

---

## 4. Store Changes

### `useRewardsStore.ts` — new additions
```typescript
// New state
allRedemptions: RewardRedemption[]     // organizer: all redemptions across users
pendingClaims: RewardRedemption[]      // derived: filter allRedemptions by status='pending'
unseenClaimCount: number               // badge count, reset when Claims tab opened
memberRedemptions: RewardRedemption[]  // member: own redemptions (renamed from redemptions)

// New actions
fetchAllRedemptions(): Promise<void>          // organizer: load all redemptions with member + reward data
approveClaim(redemptionId: string): Promise<void>
refundClaim(redemptionId: string): Promise<void>
subscribeToRedemptions(): () => void          // realtime INSERT listener for new claims
markClaimsAsSeen(): void                      // resets unseenClaimCount to 0
```

### RPC calls
- `supabase.rpc('approve_reward_claim', { p_redemption_id, p_organizer_id })`
- `supabase.rpc('refund_reward_claim', { p_redemption_id, p_organizer_id })`

---

## 5. Notification System

### Realtime subscription
`subscribeToRedemptions()` listens to `reward_redemptions` INSERT events via `postgres_changes`. Pattern mirrors `useNotificationsStore.subscribe()`.

### On new INSERT (organizer side):
1. **Sonner toast:** `toast.info('New reward claim — [Member] requested: [Reward] ([N] pts)')`
2. **Badge increment:** `unseenClaimCount++` in store state

### OrganizerLayout recovery
`subscribeToRedemptions()` added to the `resubscribe()` function in `OrganizerLayout.tsx`, called on:
- `visibilitychange` → visible
- `window` `online` event
- `setInterval` every 5 minutes

Follows `db-connection-resilience.md` two-layer recovery pattern.

### Member-side live updates
`StatusPill` on Claim Receipts tab updates in real time when organizer approves/refunds — driven by existing realtime subscription on `reward_redemptions` UPDATE events (already in `subscribeToChanges()`).

---

## 6. Files Touched

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_reward_claim_workflow.sql` | New migration |
| `packages/supabase/src/database.types.ts` | Regenerate after migration |
| `apps/member/src/stores/useRewardsStore.ts` | New state + actions + realtime |
| `apps/member/src/pages/rewards/Rewards.tsx` | Claim receipt in modal + enhanced status pills + QR bottom sheet |
| `apps/member/src/pages/organizer/rewards/RewardsManagement.tsx` | Claims tab + approval cards + refund sheet |
| `apps/member/src/components/OrganizerLayout.tsx` | Add subscribeToRedemptions to resubscribe() |

---

## 7. Verification Plan

1. **DB:** Run migration, confirm `status` check allows `'cancelled'`, confirm `reviewed_by`/`reviewed_at` columns exist
2. **RPC guard:** Call `refund_reward_claim` on a `'claimed'` redemption → confirm error response
3. **Member flow:** Redeem a reward → confirm points deducted → confirm QR receipt shown → confirm Claim Receipts tab shows "Awaiting Verification"
4. **Organizer approve:** Open Claims tab → approve claim → confirm member's status updates to "Verified" in real time
5. **Organizer refund:** Open Claims tab → refund pending claim → confirm points restored in member's Points History → confirm status shows "Refunded"
6. **Notification:** Redeem from member account → confirm organizer sees sonner toast + badge increment on Claims tab
7. **State guard:** Attempt to refund an approved claim via UI → confirm button is absent; via RPC → confirm error
