# IDOR Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 7 IDOR/authorization gaps identified in the security audit — all without breaking existing functionality.

**Architecture:** Two-layer fix: (1) a single SQL migration that creates SECURITY DEFINER RPCs and corrected RLS policies, (2) three TypeScript component updates that call the new RPCs instead of broken direct table writes. The DB is the authoritative enforcement layer; the TS changes make failures visible instead of silent.

**Tech Stack:** PostgreSQL 15 (Supabase), RLS policies, SECURITY DEFINER functions, React + TypeScript (strict), Supabase JS client v2.

**Spec:** `docs/superpowers/specs/2026-03-22-idor-hardening-design.md`

---

## File Map

| Status | Path | What changes |
|--------|------|-------------|
| **Create** | `supabase/migrations/20260322_idor_hardening.sql` | All 7 SQL fixes (C0–C3, M1–M3) |
| **Modify** | `apps/member/src/pages/admin/AdminUpgradeRequests.tsx:59-65` | `handleApprove` → new 2-param RPC |
| **Modify** | `apps/member/src/pages/admin/AdminUpgradeRequests.tsx:82-93` | `handleReject` → `reject_organizer_upgrade` RPC |
| **Modify** | `apps/member/src/pages/admin/AdminCMS.tsx:161-167` | `handleApprove` → new 2-param RPC |
| **Modify** | `apps/member/src/pages/admin/AdminUsers.tsx:65-69` | `handleRoleChange` → `admin_update_user_role` RPC |

---

## Task 1: Write the migration file

**Files:**
- Create: `supabase/migrations/20260322_idor_hardening.sql`

> Write the full migration first; apply it in Task 2. This order means you can review the SQL before it touches the database.

- [ ] **Step 1.1 — Create the migration file**

Create `supabase/migrations/20260322_idor_hardening.sql` with the following content exactly:

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- IDOR HARDENING MIGRATION
-- Spec: docs/superpowers/specs/2026-03-22-idor-hardening-design.md
-- Branch: security-hardening
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Fix C0: approve_organizer_upgrade — accept hq_admin + drop old overload ──
-- PostgreSQL identifies functions by name+params. The old 5-param version must
-- be explicitly dropped; CREATE OR REPLACE with a different param list creates
-- a new overload, it does NOT replace the original.

DROP FUNCTION IF EXISTS approve_organizer_upgrade(uuid, text, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION approve_organizer_upgrade(
  p_request_id uuid,
  p_user_id    uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_req         record;
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
      reviewed_by = auth.uid(),   -- always server-side; never from caller
      reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_organizer_upgrade(uuid, uuid) TO authenticated;


-- ── Fix C1: Events DELETE — enforce chapter ownership ────────────────────────
-- The old policy let any officer delete any chapter's events. Replace it with
-- one that scopes chapter_officer to their own chapter only.

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


-- ── Fix C2: reject_organizer_upgrade — new SECURITY DEFINER RPC ──────────────
-- The admin reject flow was doing a direct profiles.update() on another user,
-- which RLS blocks silently. This RPC runs with elevated privileges and sets
-- reviewed_by server-side so the audit trail cannot be spoofed.

CREATE OR REPLACE FUNCTION reject_organizer_upgrade(
  p_request_id uuid,
  p_user_id    uuid
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
      reviewed_by = auth.uid(),   -- always server-side; never from caller
      reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reject_organizer_upgrade(uuid, uuid) TO authenticated;


-- ── Fix C3: event_announcements — create table + RLS ─────────────────────────
-- Table referenced in useNotificationsStore.ts and SendAnnouncementSheet.tsx
-- but never created. FOR INSERT and FOR UPDATE use WITH CHECK on NEW.event_id
-- (the proposed row) because the existing row doesn't exist yet at INSERT time.

CREATE TABLE IF NOT EXISTS event_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  organizer_id uuid REFERENCES profiles(id) NOT NULL,
  message      text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;

-- Members: read-only, only for events they hold an approved registration in
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

-- Officers: INSERT — WITH CHECK uses NEW.event_id (row being inserted)
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

-- Officers: UPDATE — USING filters the existing row; WITH CHECK validates the new state
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


-- ── Fix M1: admin_update_user_role — new SECURITY DEFINER RPC ────────────────
-- AdminUsers.handleRoleChange() was calling profiles.update() on an arbitrary
-- user — blocked silently by RLS. This RPC enforces role, prevents hq_admin
-- from granting super_admin, and provides an explicit audit point.

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


-- ── Fix M2: event_registrations DELETE policies ───────────────────────────────
-- No DELETE policy existed — all deletes were silently blocked by RLS.
-- Two policies: officers scoped to their chapter; members can only withdraw
-- their own pending registrations.

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

CREATE POLICY "Members can delete own pending registrations"
  ON event_registrations FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );


-- ── Fix M3: volunteer_applications DELETE policy ──────────────────────────────
-- Members could submit applications but had no way to withdraw them.
-- Status guard matches M2 pattern — only pending applications can be withdrawn.

CREATE POLICY "Members can delete own pending volunteer applications"
  ON volunteer_applications FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );
```

- [ ] **Step 1.2 — Verify the file was written**

```bash
cat "supabase/migrations/20260322_idor_hardening.sql" | head -10
```

Expected: First line is the separator comment.

---

## Task 2: Apply the migration

> This is the only step that modifies the live database. Verify the SQL in Task 1 looks correct before proceeding.

- [ ] **Step 2.1 — Apply via Supabase CLI**

```bash
cd "c:/Users/LENOVO/Documents/DEVCON+ with Claude Code"
npx supabase db push
```

Expected output: Migration `20260322_idor_hardening` applied. No errors.

If you don't have the Supabase CLI configured locally, open the **Supabase SQL Editor** for your project, paste the entire migration file content, and run it.

- [ ] **Step 2.2 — Verify Fix C0: old overload is gone**

Run in Supabase SQL Editor:
```sql
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname = 'approve_organizer_upgrade';
```

Expected: Exactly **one row** with arguments `p_request_id uuid, p_user_id uuid`. The old `(p_user_id uuid, p_role text, p_chapter_id uuid, p_request_id uuid, p_reviewer_id uuid)` row must not appear.

- [ ] **Step 2.3 — Verify Fix C1: events DELETE policy replaced**

```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'events' AND cmd = 'DELETE';
```

Expected: `Officers can delete their chapter events`. The old `Officers can delete events` must not appear.

- [ ] **Step 2.4 — Verify Fix C2 and M1: new RPCs exist**

```sql
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN ('reject_organizer_upgrade', 'admin_update_user_role');
```

Expected: Two rows — `reject_organizer_upgrade(p_request_id uuid, p_user_id uuid)` and `admin_update_user_role(p_user_id uuid, p_new_role text)`.

- [ ] **Step 2.5 — Verify Fix C3: table and policies exist**

```sql
SELECT tablename FROM pg_tables WHERE tablename = 'event_announcements';
SELECT policyname FROM pg_policies WHERE tablename = 'event_announcements';
```

Expected: Table exists; 4 policy rows: `Members view announcements for their events`, `Officers insert announcements for their chapter events`, `Officers update announcements for their chapter events`, `Officers delete announcements for their chapter events`.

- [ ] **Step 2.6 — Verify Fix M2 and M3: new DELETE policies exist**

```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('event_registrations', 'volunteer_applications')
  AND cmd = 'DELETE';
```

Expected: 3 rows — two for `event_registrations`, one for `volunteer_applications`.

- [ ] **Step 2.7 — Commit the migration file**

```bash
git add supabase/migrations/20260322_idor_hardening.sql
git commit -m "feat(security): IDOR hardening migration — RLS + SECURITY DEFINER RPCs

- C0: replace approve_organizer_upgrade to accept hq_admin, drop old overload
- C1: add chapter_id scope to events DELETE policy
- C2: add reject_organizer_upgrade SECURITY DEFINER RPC
- C3: create event_announcements table with full RLS
- M1: add admin_update_user_role SECURITY DEFINER RPC
- M2: add event_registrations DELETE policies (officer + member-pending)
- M3: add volunteer_applications DELETE policy (member-pending only)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Update AdminUpgradeRequests.tsx

**Files:**
- Modify: `apps/member/src/pages/admin/AdminUpgradeRequests.tsx:59-65` (handleApprove)
- Modify: `apps/member/src/pages/admin/AdminUpgradeRequests.tsx:82-93` (handleReject)

- [ ] **Step 3.1 — Replace handleApprove RPC call (lines 59–65)**

Find this block (lines 59–65):
```typescript
      const { error } = await supabase.rpc('approve_organizer_upgrade', {
        p_user_id:     req.user_id,
        p_role:        req.requested_role,
        p_chapter_id:  req.chapter_id ?? null,
        p_request_id:  req.id,
        p_reviewer_id: user.id,
      })
```

Replace with:
```typescript
      const { error } = await supabase.rpc('approve_organizer_upgrade', {
        p_request_id: req.id,
        p_user_id:    req.user_id,
      })
```

- [ ] **Step 3.2 — Replace handleReject (lines 82–93) — two direct writes → one RPC**

Find this block (lines 82–93):
```typescript
      // Clear pending state on profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ pending_role: null, pending_chapter_id: null })
        .eq('id', req.user_id)
      if (profileErr) throw profileErr

      // Mark request rejected
      const { error: reqErr } = await supabase
        .from('organizer_upgrade_requests')
        .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', req.id)
      if (reqErr) throw reqErr
```

Replace with:
```typescript
      const { error } = await supabase.rpc('reject_organizer_upgrade', {
        p_request_id: req.id,
        p_user_id:    req.user_id,
      })
      if (error) throw error
```

- [ ] **Step 3.3 — TypeScript check**

```bash
cd "c:/Users/LENOVO/Documents/DEVCON+ with Claude Code"
npm run typecheck 2>&1 | grep -i "AdminUpgradeRequests"
```

Expected: No errors for this file.

- [ ] **Step 3.4 — Commit**

```bash
git add apps/member/src/pages/admin/AdminUpgradeRequests.tsx
git commit -m "fix(security): AdminUpgradeRequests — use new 2-param approve RPC + reject RPC

- handleApprove: drop 5-param call → 2-param approve_organizer_upgrade
- handleReject: replace broken direct profile/request updates → reject_organizer_upgrade RPC
  (old direct writes were silently blocked by RLS; reviewed_by was never written)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Update AdminCMS.tsx

**Files:**
- Modify: `apps/member/src/pages/admin/AdminCMS.tsx:161-167` (handleApprove)

- [ ] **Step 4.1 — Replace handleApprove RPC call (lines 161–167)**

Find this block (lines 161–167):
```typescript
      const { error } = await supabase.rpc('approve_organizer_upgrade', {
        p_user_id:     req.user_id,
        p_role:        req.requested_role,
        p_chapter_id:  req.chapter_id ?? null,
        p_request_id:  req.id,
        p_reviewer_id: user.id,
      })
```

Replace with:
```typescript
      const { error } = await supabase.rpc('approve_organizer_upgrade', {
        p_request_id: req.id,
        p_user_id:    req.user_id,
      })
```

- [ ] **Step 4.2 — TypeScript check**

```bash
npm run typecheck 2>&1 | grep -i "AdminCMS"
```

Expected: No errors for this file.

- [ ] **Step 4.3 — Commit**

```bash
git add apps/member/src/pages/admin/AdminCMS.tsx
git commit -m "fix(security): AdminCMS — use new 2-param approve_organizer_upgrade RPC

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update AdminUsers.tsx

**Files:**
- Modify: `apps/member/src/pages/admin/AdminUsers.tsx:65-69` (handleRoleChange)

- [ ] **Step 5.1 — Replace direct profiles.update with RPC (lines 65–69)**

Find this block (lines 65–69):
```typescript
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (dbErr) { setError(dbErr.message); return }
```

Replace with:
```typescript
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const { error: dbErr } = await supabase.rpc('admin_update_user_role', {
      p_user_id:  userId,
      p_new_role: newRole,
    })
    if (dbErr) { setError(dbErr.message); return }
```

- [ ] **Step 5.2 — TypeScript check**

```bash
npm run typecheck 2>&1 | grep -i "AdminUsers"
```

Expected: No errors for this file.

- [ ] **Step 5.3 — Full typecheck pass**

```bash
npm run typecheck
```

Expected: Zero errors across the entire project.

- [ ] **Step 5.4 — Commit**

```bash
git add apps/member/src/pages/admin/AdminUsers.tsx
git commit -m "fix(security): AdminUsers — use admin_update_user_role RPC instead of direct write

Direct profiles.update({ role }) on another user was silently blocked by RLS.
RPC enforces hq_admin/super_admin gate and prevents hq_admin from granting super_admin.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Final verification

- [ ] **Step 6.1 — Confirm no old 5-param call sites remain**

```bash
grep -r "p_reviewer_id" apps/member/src/
grep -r "p_role.*req.requested_role" apps/member/src/
```

Expected: No output (both patterns should be gone).

- [ ] **Step 6.2 — Confirm new RPCs are referenced correctly**

```bash
grep -r "reject_organizer_upgrade\|admin_update_user_role" apps/member/src/
```

Expected: `reject_organizer_upgrade` appears in `AdminUpgradeRequests.tsx`; `admin_update_user_role` appears in `AdminUsers.tsx`.

- [ ] **Step 6.3 — Full typecheck one final time**

```bash
npm run typecheck
```

Expected: Zero errors.

- [ ] **Step 6.4 — Final summary commit (if any loose files)**

```bash
git status
```

Expected: Clean working tree. All changes committed in Tasks 2–5.

---

## Testing Checklist (manual — run in Supabase SQL Editor)

Run these as different roles to verify behavior. Use `SET LOCAL ROLE` or test via the app UI with test accounts.

**C0:**
- [ ] Old 5-param overload is gone (verified in Step 2.2)
- [ ] `approve_organizer_upgrade` succeeds for `hq_admin` caller
- [ ] `approve_organizer_upgrade` succeeds for `super_admin` caller
- [ ] `approve_organizer_upgrade` fails for `chapter_officer` caller

**C1:**
- [ ] Officer (chapter A) cannot DELETE an event from chapter B
- [ ] Officer (chapter A) CAN DELETE an event from chapter A
- [ ] `hq_admin` can DELETE events from any chapter

**C2:**
- [ ] `reject_organizer_upgrade` fails for `chapter_officer` caller
- [ ] `reject_organizer_upgrade` succeeds for `hq_admin` — `reviewed_by` is set to caller's uid, not a caller-supplied value
- [ ] `reject_organizer_upgrade` succeeds for `super_admin`

**C3:**
- [ ] Member without approved registration cannot SELECT from `event_announcements`
- [ ] Member with `pending` registration cannot SELECT
- [ ] Member with `approved` registration CAN SELECT
- [ ] Non-officer INSERT is rejected by RLS
- [ ] Officer from chapter B cannot INSERT for chapter A's event
- [ ] Officer from chapter A CAN INSERT for chapter A's event

**M1:**
- [ ] `admin_update_user_role` fails for `chapter_officer` caller
- [ ] `admin_update_user_role` succeeds for `hq_admin` setting role to `chapter_officer`
- [ ] `admin_update_user_role` fails when `hq_admin` tries to set `super_admin`
- [ ] `admin_update_user_role` succeeds for `super_admin` setting any role
- [ ] `admin_update_user_role` fails for unknown role string

**M2:**
- [ ] Member cannot DELETE an `approved` registration
- [ ] Member CAN DELETE their own `pending` registration
- [ ] Officer (chapter A) CAN DELETE a registration for chapter A's event
- [ ] Officer (chapter A) cannot DELETE a registration for chapter B's event

**M3:**
- [ ] Member CAN DELETE their own `pending` application
- [ ] Member cannot DELETE their own `approved` application
