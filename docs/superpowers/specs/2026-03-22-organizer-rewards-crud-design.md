# Organizer Rewards CRUD — Design Spec
**Date:** 2026-03-22
**Status:** Approved
**Scope:** Add Create and Edit forms for the rewards catalog inside the Organizer flow

---

## 1. Problem Statement

The `/organizer/rewards` management page (`OrgRewardsManagement`) already lists rewards and supports soft-delete, but the **Add Reward** and **Edit** buttons both route to `ComingSoonModal`. This spec defines the full Create + Edit flow.

---

## 2. Access Control

All organizer roles may manage rewards: `chapter_officer`, `hq_admin`, `super_admin`. No extra role-gate is added — the existing `OrganizerLayout` guard (`isOrganizerSession`) is sufficient.

---

## 3. Architecture

### 3.1 New Files
```
apps/member/src/pages/organizer/rewards/
  rewardFormConstants.tsx    — Zod schema, inputClass, labelClass, SectionHeader (JSX), field option arrays
  RewardForm.tsx             — shared form component (create + edit modes via props)
  RewardCreate.tsx           — thin shell; navigates to /organizer/rewards on success
  RewardEdit.tsx             — thin shell; pre-fills from store; includes single-step Danger Zone
```
> `rewardFormConstants.tsx` uses `.tsx` (not `.ts`) because it exports the `SectionHeader` JSX component, matching `eventFormConstants.tsx`.

### 3.2 Modified Files
| File | Change |
|---|---|
| `RewardsManagement.tsx` | Plus → navigate to `/organizer/rewards/create`; Pencil → `/organizer/rewards/:id/edit`; **replace `useEffect(() => { void fetchRewards() })` with `fetchAllRewards()`**; the rewards list and both stat counters (Total / Active) now read from `allRewards` not `rewards`; keep existing single-step inline delete |
| `useRewardsStore.ts` | Add `allRewards: Reward[]` state; add `isLoadingAll: boolean` (separate from `isLoading` to avoid interference with member-facing spinner); add `fetchAllRewards`, `createReward`, `updateReward`; update `deleteReward` to also optimistically remove from `allRewards` |
| `router.tsx` | Register `/organizer/rewards/create` **before** `/organizer/rewards/:id/edit` (React Router v7 matches in declaration order — `create` must come first to avoid being captured by `:id`) |
| Supabase | Guard migration for `stock_remaining` / `max_per_user` (columns already exist in `database.types.ts` from rewards-engine commit — `IF NOT EXISTS` makes the migration a safe no-op; **do not re-run `supabase gen types typescript`** — types are already correct); create `reward-images` storage bucket + RLS policy |

### 3.3 New Routes
```
/organizer/rewards/create       → RewardCreate
/organizer/rewards/:id/edit     → RewardEdit
```

---

## 4. Form Fields

`RewardForm` renders all fields. Create mode passes empty defaults; Edit mode passes the existing reward as `defaultValues`.

| Section | Field | Type | Required | Notes |
|---|---|---|---|---|
| **Details** | Name | text | ✅ | min 2 chars |
| | Description | textarea | ❌ | optional; empty string mapped to `null` before DB write |
| | Points Cost | number | ✅ | integer ≥ 1; `<input type="number">` with `coerce: true` in schema |
| **Media** | Image | file upload | ❌ | Supabase Storage `reward-images` bucket; tap-to-upload dashed border; preview + ✕ remove; existing image pre-loaded in edit mode with ✕ to clear; non-blocking on upload failure; fallback gradient icon on member side when `image_url = null` |
| **Type & Claim** | Type | Physical / Digital pill toggle | ✅ | switching to Digital auto-sets `claim_method` to `digital_delivery` and locks the Claim Method field; switching back to Physical unlocks and resets `claim_method` to `onsite` |
| | Claim Method | On-site / Digital Delivery pills | ✅ | locked/disabled when Type = Digital |
| **Inventory** | Stock Remaining | number | ❌ | blank / empty string → `null` in DB = unlimited |
| | Max Per User/yr | number | ❌ | blank / empty string → `null` in DB = no limit; min 1 if provided |
| **Visibility** | Is Active | boolean toggle | ✅ | default `true` on create |
| | Is Coming Soon | boolean toggle | ✅ | default `true` on create |

---

## 5. Zod Schema (`rewardFormConstants.tsx`)

```ts
export const schema = z.object({
  name:             z.string().min(2, 'Name must be at least 2 characters'),
  description:      z.string().optional().or(z.literal('')),
  points_cost:      z.number({ coerce: true }).int().min(1, 'Must be at least 1 pt'),
  type:             z.enum(['physical', 'digital']),
  claim_method:     z.enum(['onsite', 'digital_delivery']),
  stock_remaining:  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0).nullable()
  ),
  max_per_user:     z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(1, 'Must be at least 1').nullable()
  ),
  is_active:        z.boolean().default(true),
  is_coming_soon:   z.boolean().default(true),
})

export type RewardFormData = z.infer<typeof schema>
```

Store methods receive `RewardFormData` as their payload type (same pattern as EventCreate — Zod-inferred type, no separate Insert/Update types needed).

**Description null mapping:** In `createReward` and `updateReward`, transform `description: '' | undefined` → `null` before writing to Supabase.

---

## 6. Store Changes (`useRewardsStore.ts`)

```ts
interface RewardsState {
  // existing
  rewards: Reward[]           // active only — used by member Rewards page
  redemptions: RewardRedemption[]
  isLoading: boolean
  error: string | null

  // new
  allRewards: Reward[]        // all rewards including inactive — used by organizer

  // existing actions (unchanged signatures)
  fetchRewards: () => Promise<void>
  deleteReward: (id: string) => Promise<void>   // updated: also removes from allRewards
  subscribeToChanges: () => () => void
  redeemReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>
  loadRedemptions: () => Promise<void>

  // new actions
  fetchAllRewards: () => Promise<void>
  createReward: (data: RewardFormData) => Promise<void>
  updateReward: (id: string, data: RewardFormData) => Promise<void>
}
```

**Loading flag strategy:**
- `fetchAllRewards`: sets **`isLoadingAll: true/false`** (separate flag — avoids interfering with the member-facing `isLoading` used by the Rewards page spinner and `RewardEdit`'s guard in §9)
- `createReward` / `updateReward`: do NOT touch any loading flag (React Hook Form's `isSubmitting` handles the submit button UI); throw on error so the form catches and displays `submitError`
- `fetchRewards` / `redeemReward` / `loadRedemptions`: continue using the existing `isLoading` flag unchanged

**Description null coercion (store responsibility):**
Both `createReward` and `updateReward` must coerce `description: '' | undefined` → `null` before the Supabase INSERT/UPDATE call. The Zod schema does not perform this coercion — it is an explicit transform in the store methods.

**Post-write refresh:** On successful `createReward` or `updateReward`, re-run both `fetchAllRewards()` **and** `fetchRewards()` so the member-facing `rewards` slice stays in sync.

**`deleteReward` update:** After soft-delete, filter both `rewards` and `allRewards` locally (optimistic update, no extra DB call needed).

---

## 7. Image Upload

- **Bucket:** `reward-images` (public) — created once via Supabase dashboard (manual, one-time step)
- **Path:** `{userId}/{timestamp}-{originalFilename}`
- **Flow:** identical to EventCreate — `fileInputRef`, `URL.createObjectURL` for local preview, Supabase Storage upload on form submit, `getPublicUrl` for stored URL
- **Edit mode:** existing `image_url` pre-loaded as `coverPreview`; ✕ button clears `coverPreview` and sets `coverFile = null`, resulting in `image_url: null` on save
- **On upload failure:** non-blocking — saves reward without image, shows inline `coverUploadError` message
- **Member fallback:** existing `CARD_GRADIENTS` cycle in `Rewards.tsx` already handles `image_url = null`

---

## 8. Delete Behaviour

### 8.1 Inline delete in `RewardsManagement` (list row) — keep as-is
Existing pattern: tap Trash → inline `deleteConfirmId` row expands with Cancel / Remove buttons. Single step, no sheet. Action: `deleteReward(id)`.

### 8.2 Danger Zone in `RewardEdit` — single-step (intentional divergence from EventEdit)
EventEdit uses a 2-step bottom sheet. RewardEdit uses **one step only** by design — rewards are less critical than events (which have registered attendees). A single bottom sheet with:
- Reward name
- "This will remove it from the member catalog." warning text
- Cancel + Remove buttons
- Disabled state while deleting

Action: `deleteReward(id)` → on success, `navigate('/organizer/rewards', { replace: true })`.

---

## 9. RewardForm Props Contract

```ts
interface RewardFormProps {
  reward?: Reward          // present = edit mode; absent = create mode
  onSuccess: () => void    // called after successful save (shell navigates away)
}
```

The form derives `defaultValues` from `reward` internally. `rewardId` is read from `useParams` inside `RewardEdit`, not passed as a prop.

---

## 10. RewardEdit — Loading & Not-Found Guards

Mirrors EventEdit exactly:

1. On mount: if `allRewards.length === 0`, call `fetchAllRewards()`
2. `reward = allRewards.find((r) => r.id === id)`
3. While `isLoadingAll && allRewards.length === 0`: render centered spinner
4. If `!reward` after loading: `return <NotFound />` (known: NotFound renders with member-facing styling inside OrganizerLayout — acceptable for MVP, same as EventEdit)

---

## 11. Submit Button States

Both Create and Edit follow the EventCreate/EventEdit pattern:
- `disabled={isSubmitting}` + label changes to `"Creating…"` / `"Saving…"` while submitting
- Prevents double-submits

---

## 12. Navigation Flow

```
/organizer/rewards
  ├── [+ Add Reward] → /organizer/rewards/create
  │     └── submit success → /organizer/rewards
  └── [✏ Edit] on card → /organizer/rewards/:id/edit
        ├── submit success → /organizer/rewards
        └── [Remove from catalog] → soft-delete → /organizer/rewards (replace: true)
```

---

## 12. Supabase — Migration & Storage

### Migration
```sql
-- Guard: columns likely already exist from rewards-engine commit (600187f).
-- IF NOT EXISTS makes this safe to re-run.
ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS stock_remaining integer,
  ADD COLUMN IF NOT EXISTS max_per_user integer;
```

### Storage bucket (one-time manual step via Supabase dashboard)
Create bucket `reward-images`, set to **public**.

### RLS policy for uploads
```sql
-- Only authenticated users can upload to reward-images.
-- Note: any authenticated member could technically call this — organizer gating
-- is enforced at the UI level (OrganizerLayout guard). Acceptable for MVP.
CREATE POLICY "Authenticated users can upload reward images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reward-images' AND auth.role() = 'authenticated');
```

### Image URL source in `RewardForm`
`userId` for the upload path is obtained via `useAuthStore()` hook call inside the component (same as EventCreate/EventEdit — not via the store methods).

---

## 13. Post-Implementation Validation

After each major step, run:
1. `npm run typecheck` — zero type errors required before moving to the next step
2. Manual CRUD smoke-test against Supabase:
   - **Create**: new reward appears in organizer list (`allRewards`); appears in member list only when `is_active=true`
   - **Edit**: changes persist; existing image can be replaced or removed
   - **Delete**: reward disappears from both `rewards` and `allRewards` immediately (optimistic)
   - **Image upload**: URL stored in `image_url`; member card renders image; falls back to gradient when `null`
   - **Type edge case**: switching Type to Digital locks Claim Method; switching back to Physical resets Claim Method to On-site

---

## 14. Out of Scope

- `financial_cost_php` field
- Bulk operations
- Reward ordering / drag-to-reorder
- Admin layout rewards route (admin uses organizer route for MVP)
- Auto-deactivation when `stock_remaining` reaches 0 (existing "Out of Stock" overlay on member side handles display; no server-side auto-deactivation needed for MVP)
