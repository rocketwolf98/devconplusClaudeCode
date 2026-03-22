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
6. The existing `approve_organizer_upgrade` RPC gates on `super_admin` only, violating the authorization model — `hq_admin` cannot approve requests.

---

## Authorization Model (Clarified)

`hq_admin` shares all capabilities of `super_admin`. Every RPC and RLS policy that gates on `super_admin` must also accept `hq_admin`. The one exception is self-referential: only `super_admin` can promote another user to `super_admin`.

```
super_admin ≡ hq_admin > chapter_officer > member
Exception: only super_admin may grant super_admin role
```

---

## Approach

**Two-layer defense:**

- **Layer 1 — Database (authoritative):** All enforcement lives in PostgreSQL: RLS policies and `SECURITY DEFINER` RPCs. No client code can bypass this.
- **Layer 2 — Application (fail-fast):** Affected store functions and components are updated to call the correct RPCs so failures surface as real errors with UI feedback, not silent no-ops.

---

## Deliverables

### 1. Migration: `20260322_idor_hardening.sql`

Seven targeted changes in a single migration file.

---

#### Fix C0 — Patch `approve_organizer_upgrade` to accept `hq_admin`

**Problem:** The existing RPC in `017_security_fixes.sql` has the signature `(p_user_id uuid, p_role text, p_chapter_id uuid, p_request_id uuid, p_reviewer_id uuid)` and checks `role = 'super_admin'` only. Per the authorization model `hq_admin ≡ super_admin`, `hq_admin` must also be able to approve upgrade requests. Additionally, `reviewed_by` is currently set from the caller-supplied `p_reviewer_id` (audit trail can be spoofed) — it should always use `auth.uid()` server-side.

**Note:** PostgreSQL identifies functions by name + parameter types. `CREATE OR REPLACE` with a different parameter list creates a new overload — it does NOT replace the original. The old five-parameter version must be explicitly dropped first, and both calling sites must be updated to the new two-parameter signature.

**Fix — drop old overload, create replacement that reads role/chapter from the request row:**
```sql
-- Drop the old five-parameter overload first
DROP FUNCTION IF EXISTS approve_organizer_upgrade(uuid, text, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION approve_organizer_upgrade(
  p_request_id uuid,
  p_user_id     uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  text;
  v_req          record;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('hq_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT chapter_id, requested_role INTO v_req
  FROM organizer_upgrade_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already resolved';
  END IF;

  UPDATE profiles
  SET role               = v_req.requested_role,
      chapter_id         = COALESCE(v_req.chapter_id, chapter_id),
      pending_role       = NULL,
      pending_chapter_id = NULL
  WHERE id = p_user_id;

  UPDATE organizer_upgrade_requests
  SET status      = 'approved',
      reviewed_by = auth.uid(),   -- always server-side; never trusted from caller
      reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_organizer_upgrade(uuid, uuid) TO authenticated;
```

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

`hq_admin` and `super_admin` retain cross-chapter delete authority. `chapter_officer` is scoped to their own chapter only.

---

#### Fix C2 — `reject_organizer_upgrade()` SECURITY DEFINER RPC

**Problem:** `AdminUpgradeRequests.handleReject()` calls `profiles.update()` directly on another user's row. This is blocked by RLS, so it silently fails and never writes `reviewed_by` / `reviewed_at`.

**Fix — new SECURITY DEFINER function (no caller-supplied reviewer ID — always uses `auth.uid()` server-side):**
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
  SET pending_role       = NULL,
      pending_chapter_id = NULL
  WHERE id = p_user_id;

  UPDATE organizer_upgrade_requests
  SET status      = 'rejected',
      reviewed_by = auth.uid(),   -- set server-side; never trusted from caller
      reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reject_organizer_upgrade(uuid, uuid) TO authenticated;
```

---

#### Fix C3 — `event_announcements` table + RLS

**Problem:** Table is referenced in `useNotificationsStore.ts` and `SendAnnouncementSheet.tsx` but never created. No RLS → no access control. `useNotificationsStore` correctly filters client-side by `approvedIds` (IDs from approved `event_registrations`) but the server enforces nothing without RLS.

**Fix — create table with RLS from day one. The officer write policy is split into explicit operations so `WITH CHECK` applies correctly to INSERT/UPDATE (PostgreSQL does not auto-derive `WITH CHECK` from `USING` for `FOR ALL` when row doesn't yet exist):**

```sql
CREATE TABLE IF NOT EXISTS event_announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  organizer_id  uuid REFERENCES profiles(id) NOT NULL,
  message       text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;

-- Members: read-only, only for events they are approved-registered in
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

-- Officers: INSERT — WITH CHECK uses NEW.event_id to scope to their chapter
CREATE POLICY "Officers insert announcements for their chapter events"
  ON event_announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = NEW.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  );

-- Officers: UPDATE — USING filters existing row, WITH CHECK validates new state
CREATE POLICY "Officers update announcements for their chapter events"
  ON event_announcements FOR UPDATE
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN profiles p ON p.id = auth.uid()
      WHERE e.id = NEW.event_id
        AND p.role IN ('chapter_officer', 'hq_admin', 'super_admin')
        AND (
          p.role IN ('hq_admin', 'super_admin')
          OR p.chapter_id = e.chapter_id
        )
    )
  );

-- Officers: DELETE — USING only (no new row)
CREATE POLICY "Officers delete announcements for their chapter events"
  ON event_announcements FOR DELETE
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

-- Members can withdraw their own pending registrations only
CREATE POLICY "Members can delete own pending registrations"
  ON event_registrations FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );
```

---

#### Fix M3 — `volunteer_applications` DELETE policy

**Problem:** Members can submit but not withdraw applications. No status guard means approved volunteers could also delete their records.

**Fix — withdrawal limited to `pending` status, matching the M2 pattern:**
```sql
CREATE POLICY "Members can delete own pending volunteer applications"
  ON volunteer_applications FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );
```

---

### 2. Application code changes

#### `AdminUpgradeRequests.tsx` — `handleApprove` (Fix C0)

Update the `approve_organizer_upgrade` call to the new two-parameter signature:

```typescript
// BEFORE (five-parameter signature — old overload, super_admin only, p_reviewer_id spoofable)
const { error } = await supabase.rpc('approve_organizer_upgrade', {
  p_user_id:     req.user_id,
  p_role:        req.requested_role,
  p_chapter_id:  req.chapter_id ?? null,
  p_request_id:  req.id,
  p_reviewer_id: user.id,
})
if (error) throw error

// AFTER (two-parameter signature — hq_admin accepted, reviewed_by set server-side)
const { error } = await supabase.rpc('approve_organizer_upgrade', {
  p_request_id: req.id,
  p_user_id:    req.user_id,
})
if (error) throw error
```

#### `AdminCMS.tsx` — `handleApprove` (Fix C0)

Same call-site update:

```typescript
// BEFORE
const { error } = await supabase.rpc('approve_organizer_upgrade', {
  p_user_id:     req.user_id,
  p_role:        req.requested_role,
  p_chapter_id:  req.chapter_id ?? null,
  p_request_id:  req.id,
  p_reviewer_id: user.id,
})
if (error) throw error

// AFTER
const { error } = await supabase.rpc('approve_organizer_upgrade', {
  p_request_id: req.id,
  p_user_id:    req.user_id,
})
if (error) throw error
```

---

#### `AdminUpgradeRequests.tsx` — `handleReject`

Replace the broken direct-update block with a single RPC call:

```typescript
// BEFORE (broken — silently fails via RLS; reviewed_by never written)
const { error: profileErr } = await supabase
  .from('profiles')
  .update({ pending_role: null, pending_chapter_id: null })
  .eq('id', req.user_id)
if (profileErr) throw profileErr

const { error: reqErr } = await supabase
  .from('organizer_upgrade_requests')
  .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
  .eq('id', req.id)
if (reqErr) throw reqErr

// AFTER (server-enforced, atomic, reviewed_by set server-side via auth.uid())
const { error } = await supabase.rpc('reject_organizer_upgrade', {
  p_request_id: req.id,
  p_user_id:    req.user_id,
})
if (error) throw error
```

#### `AdminUsers.tsx` — `handleRoleChange`

Replace the direct `profiles.update({ role })` with the RPC:

```typescript
// BEFORE (broken — silently fails via RLS)
const { error: dbErr } = await supabase
  .from('profiles')
  .update({ role: newRole })
  .eq('id', userId)
if (dbErr) { setError(dbErr.message); return }

// AFTER (server-enforced, with role validation and super_admin guard)
const { error: dbErr } = await supabase.rpc('admin_update_user_role', {
  p_user_id:  userId,
  p_new_role: newRole,
})
if (dbErr) { setError(dbErr.message); return }
```

---

## What Does NOT Change

- `SendAnnouncementSheet.tsx` and `useNotificationsStore.ts` — the RLS policies in C3 are the enforcement. The store already filters client-side by `approvedIds` (derived from approved `event_registrations`), which correctly matches the SELECT policy intent.
- All other stores — ownership checks are already correct (explicit `user_id` filters + backed by RLS).
- Edge Functions — `generate-qr-token` and `award-points-on-scan` already enforce ownership via JWT-bound queries.

---

## Out of Scope

- `profiles` DELETE policy — account deletion is handled by a separate Edge Function (`delete-account`) with its own authorization logic.
- `chapters`, `organizer_codes` — admin-only by design, no client write access in any current flow.
- Referrals cross-user SELECT — intentional product feature (referrer transparency); a `referred_user_id` can see who referred them. Documented as design decision, not a vulnerability.
- `rewards` write access for `chapter_officer` — existing policy in `014_realtime_and_missing_rls.sql` grants full rewards write to `chapter_officer`, but per CLAUDE.md only `hq_admin` should manage the rewards catalog. This is a known gap, deferred to a separate migration sprint.

---

## Testing Checklist

**C0 — approve_organizer_upgrade fix:**
- [ ] The old five-parameter overload no longer exists after migration (call with old signature returns "function does not exist")
- [ ] `approve_organizer_upgrade(p_request_id, p_user_id)` succeeds for `hq_admin` and sets `reviewed_by` to the caller's id server-side
- [ ] `approve_organizer_upgrade(p_request_id, p_user_id)` succeeds for `super_admin`
- [ ] `approve_organizer_upgrade(p_request_id, p_user_id)` fails for `chapter_officer`

**C1 — Events DELETE chapter scope:**
- [ ] Officer from Chapter A **cannot** delete events belonging to Chapter B
- [ ] Officer from Chapter A **can** delete events belonging to Chapter A
- [ ] `hq_admin` can delete events from any chapter

**C2 — reject_organizer_upgrade RPC:**
- [ ] `reject_organizer_upgrade()` fails for `chapter_officer` role
- [ ] `reject_organizer_upgrade()` succeeds for `hq_admin` and sets `reviewed_by` / `reviewed_at` server-side
- [ ] `reject_organizer_upgrade()` succeeds for `super_admin`

**C3 — event_announcements RLS:**
- [ ] Member with no registration cannot SELECT from `event_announcements` for that event
- [ ] Member with `pending` registration cannot SELECT
- [ ] Member with `approved` registration can SELECT
- [ ] Member (non-officer) INSERT is rejected
- [ ] Officer from Chapter B cannot INSERT announcement for Chapter A's event
- [ ] Officer from Chapter A can INSERT announcement for Chapter A's event

**M1 — admin_update_user_role RPC:**
- [ ] `admin_update_user_role()` fails for `chapter_officer` role
- [ ] `admin_update_user_role()` succeeds for `hq_admin` setting role to `chapter_officer`
- [ ] `admin_update_user_role()` fails when `hq_admin` tries to set `super_admin` role
- [ ] `admin_update_user_role()` succeeds for `super_admin` promoting to `super_admin`
- [ ] `admin_update_user_role()` fails for an unknown role string

**M2 — event_registrations DELETE:**
- [ ] Member cannot DELETE an `approved` registration
- [ ] Member can DELETE their own `pending` registration
- [ ] Officer from Chapter A can DELETE a registration for Chapter A's event
- [ ] Officer from Chapter A cannot DELETE a registration for Chapter B's event

**M3 — volunteer_applications DELETE:**
- [ ] Member can DELETE their own `pending` application
- [ ] Member cannot DELETE their own `approved` application
