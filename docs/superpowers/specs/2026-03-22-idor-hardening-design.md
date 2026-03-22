# IDOR Hardening Design Spec
**Date:** 2026-03-22
**Branch:** security-hardening
**Status:** Approved for implementation

---

## Problem Statement

A full IDOR (Insecure Direct Object Reference) audit of the DEVCON+ codebase identified 3 critical and 3 moderate gaps in ownership enforcement. These must be closed before production deployment. The root causes are:

1. Missing `chapter_id` scope on the events DELETE RLS policy — any officer can delete any chapter's events.
2. The admin "reject upgrade" flow does a direct `profiles.update()` on another user's row — it silently fails via RLS and never writes the audit fields (`reviewed_by`, `reviewed_at`).
3. The `event_announcements` table is referenced in two source files but has no migration and no RLS — no enforcement exists.
4. Admin role-change also does a direct `profiles.update()` on an arbitrary user — also silently fails.
5. `event_registrations` and `volunteer_applications` have no DELETE RLS policies.

---

## Authorization Model (Clarified)

`hq_admin` shares all capabilities of `super_admin` for the purposes of this work. Every RPC and RLS policy that gates on `super_admin` must also accept `hq_admin`.

```
super_admin ≡ hq_admin > chapter_officer > member
```

---

## Approach

**Two-layer defense:**

- **Layer 1 — Database (authoritative):** All enforcement lives in PostgreSQL: RLS policies and `SECURITY DEFINER` RPCs. No client code can bypass this.
- **Layer 2 — Application (fail-fast):** Affected store functions and components are updated to call the correct RPCs so failures surface as real errors with UI feedback, not silent no-ops.

---

## Deliverables

### 1. Migration: `20260322_idor_hardening.sql`

Six targeted changes in a single migration file.

---

#### Fix C1 — Events DELETE: enforce chapter ownership

**Current policy** (in `014_realtime_and_missing_rls.sql`):
```sql
CREATE POLICY "Officers can delete events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('chapter_officer', 'hq_admin', 'super_admin')
    )
  );
```

**Problem:** Any officer can delete any chapter's events — no `chapter_id` scope.

**Fix — drop and recreate with chapter ownership:**
```sql
DROP POLICY IF EXISTS "Officers can delete events" ON events;

CREATE POLICY "Officers can delete their chapter events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = events.chapter_id
        )
    )
  );
```

`hq_admin` and `super_admin` retain cross-chapter delete authority. `chapter_officer` is scoped to their own chapter.

---

#### Fix C2 — `reject_organizer_upgrade()` SECURITY DEFINER RPC

**Problem:** `AdminUpgradeRequests.handleReject()` calls `profiles.update()` directly on another user's row. This is blocked by RLS (`USING (auth.uid() = id)`), so it silently fails and never writes `reviewed_by` / `reviewed_at`.

**Fix — new SECURITY DEFINER function:**
```sql
CREATE OR REPLACE FUNCTION reject_organizer_upgrade(
  p_request_id uuid,
  p_user_id     uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('hq_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET pending_role = NULL, pending_chapter_id = NULL
  WHERE id = p_user_id;

  UPDATE organizer_upgrade_requests
  SET status      = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reject_organizer_upgrade(uuid, uuid) TO authenticated;
```

---

#### Fix C3 — `event_announcements` table + RLS

**Problem:** Table is referenced in `useNotificationsStore.ts` and `SendAnnouncementSheet.tsx` but never created. No RLS → no access control.

**Fix — create table with RLS from day one:**
```sql
CREATE TABLE IF NOT EXISTS event_announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  organizer_id  uuid REFERENCES profiles(id) NOT NULL,
  message       text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;

-- Members can only read announcements for events they are approved-registered in
CREATE POLICY "Members view announcements for their events"
  ON event_announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_registrations er
      WHERE er.event_id = event_announcements.event_id
        AND er.user_id  = auth.uid()
        AND er.status   = 'approved'
    )
  );

-- Officers can manage announcements only for their chapter's events
CREATE POLICY "Officers manage announcements for their chapter events"
  ON event_announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_announcements.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  );
```

---

#### Fix M1 — `admin_update_user_role()` SECURITY DEFINER RPC

**Problem:** `AdminUsers.handleRoleChange()` calls `profiles.update({ role })` directly on an arbitrary user — blocked by RLS, silently fails, no audit trail.

**Fix — new SECURITY DEFINER function with role allowlist:**
```sql
CREATE OR REPLACE FUNCTION admin_update_user_role(
  p_user_id  uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('hq_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_new_role NOT IN ('member', 'chapter_officer', 'hq_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  -- Only super_admin can promote to super_admin
  IF p_new_role = 'super_admin' AND v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can grant super_admin role';
  END IF;

  UPDATE profiles SET role = p_new_role WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user_role(uuid, text) TO authenticated;
```

---

#### Fix M2 — `event_registrations` DELETE policy

**Problem:** No DELETE policy — any attempted delete is silently blocked by RLS.

**Fix:**
```sql
-- Officers can delete registrations for their chapter's events only
CREATE POLICY "Officers can delete registrations for their events"
  ON event_registrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = event_registrations.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  );

-- Members can delete (withdraw) their own pending registrations
CREATE POLICY "Members can delete own pending registrations"
  ON event_registrations FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );
```

---

#### Fix M3 — `volunteer_applications` DELETE policy

**Problem:** Members can submit but not withdraw applications.

**Fix:**
```sql
-- Members can withdraw their own applications
CREATE POLICY "Members can delete own volunteer applications"
  ON volunteer_applications FOR DELETE
  USING (auth.uid() = user_id);
```

---

### 2. Application code changes

#### `AdminUpgradeRequests.tsx` — `handleReject`

Replace the direct `profiles.update()` + `organizer_upgrade_requests.update()` block with a single RPC call:

```typescript
// BEFORE (broken — silently fails via RLS)
const { error: profileErr } = await supabase
  .from('profiles')
  .update({ pending_role: null, pending_chapter_id: null })
  .eq('id', req.user_id)

const { error: reqErr } = await supabase
  .from('organizer_upgrade_requests')
  .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
  .eq('id', req.id)

// AFTER (server-enforced, atomic, with audit trail)
const { error } = await supabase.rpc('reject_organizer_upgrade', {
  p_request_id: req.id,
  p_user_id:    req.user_id,
})
```

#### `AdminUsers.tsx` — `handleRoleChange`

Replace the direct `profiles.update({ role })` with the RPC:

```typescript
// BEFORE (broken — silently fails via RLS)
const { error: dbErr } = await supabase
  .from('profiles')
  .update({ role: newRole })
  .eq('id', userId)

// AFTER (server-enforced, with role validation)
const { error: dbErr } = await supabase.rpc('admin_update_user_role', {
  p_user_id:  userId,
  p_new_role: newRole,
})
```

---

## What Does NOT Change

- `SendAnnouncementSheet.tsx` and `useNotificationsStore.ts` — the table creation + RLS policies in C3 are the enforcement. The application code already uses the correct query shape (filters by `approvedIds` from approved registrations). No code changes needed.
- All other stores — ownership checks are already correct (explicit `user_id` filters + backed by RLS).
- Edge Functions — `generate-qr-token` and `award-points-on-scan` already enforce ownership via JWT-bound queries.

---

## Out of Scope

- `profiles` DELETE policy — account deletion is handled by a separate Edge Function (`delete-account`) with its own authorization logic.
- `chapters`, `organizer_codes` — admin-only by design, no client write access in any current flow.
- Referrals cross-user SELECT — intentional product feature (referrer transparency), documented as design decision.

---

## Testing Checklist

- [ ] Officer from Chapter A cannot delete events belonging to Chapter B
- [ ] `reject_organizer_upgrade()` fails for `chapter_officer` role
- [ ] `reject_organizer_upgrade()` succeeds for `hq_admin` and sets `reviewed_by` / `reviewed_at`
- [ ] `event_announcements` SELECT returns empty for a member not registered in that event
- [ ] `event_announcements` INSERT fails for a member (non-officer)
- [ ] `admin_update_user_role()` fails for `chapter_officer` role
- [ ] `admin_update_user_role()` fails when `hq_admin` tries to set `super_admin` role
- [ ] `event_registrations` DELETE fails for a member trying to delete an approved registration
- [ ] `event_registrations` DELETE succeeds for a member deleting their own pending registration
- [ ] `volunteer_applications` DELETE succeeds for a member deleting their own application
