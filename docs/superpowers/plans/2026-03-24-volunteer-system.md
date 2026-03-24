# Volunteer System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing member-side volunteer application flow into the organizer dashboard by adding a Volunteers tab (replacing the redundant Events tab) with approve/reject/revert actions.

**Architecture:** New `useOrgVolunteerStore` fetches volunteer applications chapter-scoped via Supabase join; `VolunteerApprovalCard` renders each application with inline actions; `OrgDashboard` swaps the Events tab for Volunteers. Approval calls the existing `approve_volunteer_application` RPC (which awards points atomically). Rejection and revert use direct `.update()` calls.

**Tech Stack:** React 19, TypeScript strict, Zustand v5, Supabase JS client, Tailwind CSS v3, framer-motion, lucide-react

---

## Pre-flight: Key facts before touching code

- **Branch:** `feat/volunteer-system` (already created)
- **RLS:** Already correct in `20260324_rls_security.sql` (section B10) — the `"Officers manage chapter volunteer applications"` policy uses `FOR ALL` with `(SELECT auth.uid())` caching, covering SELECT and UPDATE scoped to the officer's chapter. **Do NOT create a duplicate RLS migration** — one already exists and uses `DROP POLICY IF EXISTS` guards. Adding another will cause a no-op at best and a conflict at worst.
- **Approval RPC:** `approve_volunteer_application(p_application_id uuid, p_organizer_id uuid)` — SECURITY DEFINER, awards points + inserts point_transaction atomically. **Must use this for approvals** — never raw `.update()` for approve.
- **Rejection/revert:** No RPC exists — use raw `.update()` directly.
- **Missing indexes:** `volunteer_applications(event_id)` FK and `volunteer_applications(status)` partial — need a new migration.
- **Dev server:** `npm run dev:member` (port 5173)
- **Typecheck:** `npm run typecheck`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260324_volunteer_indexes.sql` | Create | Missing FK index on `event_id` + partial index on `status='pending'` |
| `apps/member/src/stores/useOrgVolunteerStore.ts` | Create | Fetch + mutate volunteer applications as organizer |
| `apps/member/src/components/VolunteerApprovalCard.tsx` | Create | Render one volunteer application with approve/reject/revert actions |
| `apps/member/src/pages/organizer/Dashboard.tsx` | Modify | Swap Events tab → Volunteers tab; wire new store + component |

---

## Task 1: Add missing indexes migration

**Files:**
- Create: `supabase/migrations/20260324_volunteer_indexes.sql`

Context: `volunteer_applications.event_id` is a FK column with no index. The organizer's chapter-scoped query JOINs via `event_id` → `events.chapter_id`. Without an index, every query does a full table scan. A partial index on `status = 'pending'` speeds up the most common organizer filter.

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================
-- Missing indexes for volunteer_applications
-- Best practice: index all FK columns (schema-foreign-key-indexes)
-- Best practice: partial index for the hot query path (query-partial-indexes)
-- ============================================================

-- FK index: organizer chapter-scoped JOIN goes through event_id
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_event_id
  ON volunteer_applications(event_id);

-- Partial index: organizer pending-approval filter is the most common read path
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_pending
  ON volunteer_applications(event_id, applied_at DESC)
  WHERE status = 'pending';
```

Save to `supabase/migrations/20260324_volunteer_indexes.sql`.

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with the SQL above.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260324_volunteer_indexes.sql
git commit -m "feat(db): add missing event_id + pending partial indexes on volunteer_applications"
```

---

## Task 2: Create `useOrgVolunteerStore`

**Files:**
- Create: `apps/member/src/stores/useOrgVolunteerStore.ts`

This store is for the organizer side only. It fetches all applications for the organizer's chapter (all statuses), and exposes approve/reject/revert. Approval calls the existing RPC; rejection and revert use raw `.update()`.

- [ ] **Step 1: Create the store**

```ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export interface OrgVolunteerApplication {
  id: string
  event_id: string
  event_title: string
  user_id: string
  member_name: string
  member_email: string
  school_or_company: string
  reason: string
  phone_number: string | null
  social_media_handle: string | null
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
}

interface OrgVolunteerState {
  applications: OrgVolunteerApplication[]
  loading: boolean
  error: string | null
  loadApplications: (chapterId: string) => Promise<void>
  approveApplication: (id: string) => Promise<{ success: boolean; error?: string }>
  rejectApplication: (id: string) => Promise<{ success: boolean; error?: string }>
  revertApplication: (id: string) => Promise<{ success: boolean; error?: string }>
}

export const useOrgVolunteerStore = create<OrgVolunteerState>((set, get) => ({
  applications: [],
  loading: false,
  error: null,

  loadApplications: async (chapterId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('volunteer_applications')
      .select(`
        id,
        event_id,
        user_id,
        reason,
        phone_number,
        social_media_handle,
        status,
        applied_at,
        reviewed_at,
        reviewed_by,
        events!inner(title, chapter_id),
        profiles(full_name, email, school_or_company)
      `)
      .eq('events.chapter_id', chapterId)
      .order('applied_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    const mapped: OrgVolunteerApplication[] = (data ?? []).map((row) => {
      const ev = Array.isArray(row.events) ? row.events[0] : row.events
      const p  = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const evObj = ev as { title?: string } | null
      const pObj  = p  as { full_name?: string; email?: string; school_or_company?: string } | null
      return {
        id:                  row.id,
        event_id:            row.event_id,
        event_title:         evObj?.title ?? '',
        user_id:             row.user_id,
        member_name:         pObj?.full_name ?? 'Unknown',
        member_email:        pObj?.email ?? '',
        school_or_company:   pObj?.school_or_company ?? '',
        reason:              row.reason,
        phone_number:        row.phone_number ?? null,
        social_media_handle: row.social_media_handle ?? null,
        status:              row.status as OrgVolunteerApplication['status'],
        applied_at:          row.applied_at ?? null,
        reviewed_at:         row.reviewed_at ?? null,
        reviewed_by:         row.reviewed_by ?? null,
      }
    })
    set({ applications: mapped, loading: false })
  },

  // Use the RPC — it awards points atomically via SECURITY DEFINER
  approveApplication: async (id) => {
    const reviewerId = useAuthStore.getState().user?.id
    if (!reviewerId) return { success: false, error: 'Not authenticated' }

    const { data, error } = await supabase
      .rpc('approve_volunteer_application', {
        p_application_id: id,
        p_organizer_id:   reviewerId,
      })

    if (error) return { success: false, error: error.message }

    const result = data as { success: boolean; error?: string } | null
    if (!result?.success) return { success: false, error: result?.error ?? 'RPC failed' }

    // Mutate local state on confirmed success
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id
          ? { ...a, status: 'approved' as const, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }
          : a
      ),
    }))
    return { success: true }
  },

  rejectApplication: async (id) => {
    const reviewerId = useAuthStore.getState().user?.id
    if (!reviewerId) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('volunteer_applications')
      .update({
        status:      'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id
          ? { ...a, status: 'rejected' as const, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }
          : a
      ),
    }))
    return { success: true }
  },

  revertApplication: async (id) => {
    const { error } = await supabase
      .from('volunteer_applications')
      .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id
          ? { ...a, status: 'pending' as const, reviewed_by: null, reviewed_at: null }
          : a
      ),
    }))
    return { success: true }
  },
}))
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors in `useOrgVolunteerStore.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/stores/useOrgVolunteerStore.ts
git commit -m "feat(store): add useOrgVolunteerStore for organizer volunteer management"
```

---

## Task 3: Create `VolunteerApprovalCard` component

**Files:**
- Create: `apps/member/src/components/VolunteerApprovalCard.tsx`

Mirrors `ApprovalCard.tsx` in layout and button patterns. Key differences:
- Shows `reason` text (2-line clamp, expand on tap)
- Shows optional phone + social chips
- Date label is "Applied {date}" (not "Registered")
- Revert shown on **both** approved AND rejected (no QR token to worry about)
- No Check In button (volunteers don't have QR tickets)

- [ ] **Step 1: Create the component**

```tsx
import { memo, useState } from 'react'
import { Check, X, RotateCcw, Heart, ChevronDown, ChevronUp, Phone, AtSign } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from './StatusBadge'
import type { OrgVolunteerApplication } from '../stores/useOrgVolunteerStore'

interface VolunteerApprovalCardProps {
  application: OrgVolunteerApplication
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onRevert: (id: string) => void
}

function VolunteerApprovalCardComponent({
  application,
  onApprove,
  onReject,
  onRevert,
}: VolunteerApprovalCardProps) {
  const [reasonExpanded, setReasonExpanded] = useState(false)

  const initials = application.member_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const formattedDate = application.applied_at
    ? new Date(application.applied_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center text-blue text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{application.member_name}</p>
          <p className="text-xs text-slate-400 truncate">{application.member_email}</p>
          <p className="text-xs text-slate-400 truncate">{application.school_or_company}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {/* Event + date info */}
      <div className="bg-slate-50 rounded-xl px-3 py-2 mb-3">
        <p className="text-xs text-slate-400 mb-0.5">Event</p>
        <p className="text-sm font-semibold text-slate-700 truncate">{application.event_title}</p>
        <p className="text-xs text-slate-400 mt-1">Applied {formattedDate}</p>
      </div>

      {/* Reason */}
      <div className="mb-3">
        <p className="text-xs text-slate-400 mb-1">Reason</p>
        <p
          className={`text-sm text-slate-700 leading-relaxed ${
            reasonExpanded ? '' : 'line-clamp-2'
          }`}
        >
          {application.reason}
        </p>
        {application.reason.length > 80 && (
          <button
            onClick={() => setReasonExpanded((v) => !v)}
            className="text-xs text-blue font-semibold mt-1 flex items-center gap-0.5"
          >
            {reasonExpanded ? (
              <>Show less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Show more <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>

      {/* Optional chips */}
      {(application.phone_number || application.social_media_handle) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {application.phone_number && (
            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
              <Phone className="w-3 h-3" />
              {application.phone_number}
            </span>
          )}
          {application.social_media_handle && (
            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
              <AtSign className="w-3 h-3" />
              {application.social_media_handle}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {application.status === 'pending' && (
        <div className="flex gap-2">
          <motion.button
            onClick={() => onReject(application.id)}
            className="flex-1 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-500 hover:bg-red/5 hover:border-red hover:text-red transition-colors flex items-center justify-center gap-1.5"
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </motion.button>
          <motion.button
            onClick={() => onApprove(application.id)}
            className="flex-1 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors flex items-center justify-center gap-1.5"
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </motion.button>
        </div>
      )}

      {(application.status === 'approved' || application.status === 'rejected') && (
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs font-semibold flex items-center gap-1 ${
            application.status === 'approved' ? 'text-green' : 'text-red'
          }`}>
            <Heart className="w-3.5 h-3.5 shrink-0" />
            {application.status === 'approved' ? 'Volunteer approved' : 'Application rejected'}
          </p>
          <motion.button
            onClick={() => onRevert(application.id)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <RotateCcw className="w-3 h-3" />
            Undo
          </motion.button>
        </div>
      )}
    </div>
  )
}

export const VolunteerApprovalCard = memo(VolunteerApprovalCardComponent)
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors in `VolunteerApprovalCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/components/VolunteerApprovalCard.tsx
git commit -m "feat(component): add VolunteerApprovalCard for organizer volunteer management"
```

---

## Task 4: Update `OrgDashboard` — swap Events tab → Volunteers tab

**Files:**
- Modify: `apps/member/src/pages/organizer/Dashboard.tsx`

Key changes:
1. Import `useOrgVolunteerStore` and `VolunteerApprovalCard`
2. Change `TabId` from `'approvals' | 'events'` to `'approvals' | 'volunteers'`
3. Load volunteer applications in `useEffect` when `chapterId` is available
4. Pending stat = pending registrations + pending volunteer applications
5. Replace Events tab button + content with Volunteers tab
6. Wire approve/reject/revert to store actions

- [ ] **Step 1: Update the dashboard**

Replace the full contents of `apps/member/src/pages/organizer/Dashboard.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Bell, Plus, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrgBanner } from '../../components/OrgBanner'
import { ApprovalCard, type Registration } from '../../components/ApprovalCard'
import { VolunteerApprovalCard } from '../../components/VolunteerApprovalCard'
import { useOrganizerUser } from '../../stores/useOrgAuthStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import { useOrgVolunteerStore } from '../../stores/useOrgVolunteerStore'
import { supabase } from '../../lib/supabase'
import { fadeUp, staggerContainer, cardItem } from '../../lib/animation'

type TabId = 'approvals' | 'volunteers'

export function OrgDashboard() {
  const user = useOrganizerUser()
  const { user: profile } = useAuthStore()
  const { events, fetchEvents } = useEventsStore()
  const {
    applications: volunteerApps,
    loading: volunteerLoading,
    error: volunteerError,
    approveApplication,
    rejectApplication,
    revertApplication,
    loadApplications: loadVolunteerApps,
  } = useOrgVolunteerStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('approvals')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [membersCount, setMembersCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const chapterId = profile?.chapter_id ?? null

  useEffect(() => {
    void fetchEvents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chapterId) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      setIsLoading(true)

      // Fetch pending registrations for this chapter's events
      const { data: regData } = await supabase
        .from('event_registrations')
        .select(`
          id,
          status,
          registered_at,
          events!inner(id, title, chapter_id),
          profiles(full_name, email, school_or_company)
        `)
        .eq('status', 'pending')
        .eq('events.chapter_id', chapterId)

      const mapped: Registration[] = (regData ?? []).map((row) => {
        const ev = Array.isArray(row.events) ? row.events[0] : row.events
        const p  = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const evObj = ev as { id?: string; title?: string } | null
        const pObj  = p  as { full_name?: string; email?: string; school_or_company?: string } | null
        return {
          id:                row.id,
          member_name:       pObj?.full_name ?? 'Unknown',
          member_email:      pObj?.email ?? '',
          school_or_company: pObj?.school_or_company ?? '',
          event_title:       evObj?.title ?? '',
          registered_at:     row.registered_at ?? '',
          status:            row.status as Registration['status'],
        }
      })
      setRegistrations(mapped)

      // Fetch count of members in this chapter
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId)
      setMembersCount(count ?? 0)

      setIsLoading(false)
    }

    void loadData()
    void loadVolunteerApps(chapterId)
  }, [chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null

  const chapterEvents = events.filter((e) => e.chapter_id === chapterId)
  const pending = registrations.filter((r) => r.status === 'pending')
  const pendingVolunteers = volunteerApps.filter((a) => a.status === 'pending')

  const stats = [
    { label: 'Events',  value: chapterEvents.length },
    { label: 'Members', value: membersCount },
    { label: 'Pending', value: pending.length + pendingVolunteers.length },
  ]

  const handleApprove = async (id: string) => {
    const qrToken = 'DCN-' + crypto.randomUUID().slice(0, 8).toUpperCase()
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'approved', approved_at: new Date().toISOString(), qr_code_token: qrToken })
      .eq('id', id)
    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r))
      )
    }
  }

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r))
      )
    }
  }

  const handleRevert = async (id: string) => {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'pending', approved_at: null, qr_code_token: null })
      .eq('id', id)
    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'pending' as const } : r))
      )
    }
  }

  return (
    <div>
      <div className="bg-blue px-4 pt-12 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <div className="flex justify-end mb-3">
          <button
            onClick={() => navigate('/organizer/notifications')}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30 transition-colors"
          >
            <Bell className="w-4 h-4 text-white" />
          </button>
        </div>

        <OrgBanner
          chapterName={user.chapter}
          role={user.role === 'hq_admin' ? 'HQ Admin' : 'Chapter Officer'}
          stats={stats}
        />

        <button
          onClick={() => navigate('/organizer/events/create')}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-white/20 text-white text-sm font-bold rounded-xl active:bg-white/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      <motion.div
        className="p-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="flex gap-1 mt-2 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {(['approvals', 'volunteers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'approvals'
                ? `Approvals${pending.length > 0 ? ` (${pending.length})` : ''}`
                : `Volunteers${pendingVolunteers.length > 0 ? ` (${pendingVolunteers.length})` : ''}`}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'approvals' && (
            <motion.div
              key="approvals"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-100 rounded w-32" />
                          <div className="h-3 bg-slate-100 rounded w-48" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pending.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7 text-green" />
                  </div>
                  <p className="text-base font-bold text-slate-700">All caught up!</p>
                  <p className="text-sm text-slate-400 mt-1">No pending registrations right now.</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  <p className="text-sm text-slate-500 mb-2">
                    {pending.length} registration{pending.length !== 1 ? 's' : ''} awaiting approval
                  </p>
                  {registrations.map((reg) => (
                    <motion.div key={reg.id} variants={cardItem}>
                      <ApprovalCard
                        registration={reg}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRevert={handleRevert}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'volunteers' && (
            <motion.div
              key="volunteers"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {volunteerError && (
                <div className="bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-3">
                  <p className="text-xs text-red">{volunteerError}</p>
                </div>
              )}
              {volunteerLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-100 rounded w-32" />
                          <div className="h-3 bg-slate-100 rounded w-48" />
                          <div className="h-3 bg-slate-100 rounded w-40" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : volunteerApps.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue/10 flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-7 h-7 text-blue" />
                  </div>
                  <p className="text-base font-bold text-slate-700">No volunteer applications yet.</p>
                  <p className="text-sm text-slate-400 mt-1">Applications will appear here when members apply.</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {pendingVolunteers.length > 0 && (
                    <p className="text-sm text-slate-500 mb-2">
                      {pendingVolunteers.length} application{pendingVolunteers.length !== 1 ? 's' : ''} awaiting review
                    </p>
                  )}
                  {volunteerApps.map((app) => (
                    <motion.div key={app.id} variants={cardItem}>
                      <VolunteerApprovalCard
                        application={app}
                        onApprove={(id) => void approveApplication(id)}
                        onReject={(id) => void rejectApplication(id)}
                        onRevert={(id) => void revertApplication(id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors across all modified files.

- [ ] **Step 3: Visual QA in dev server**

```bash
npm run dev:member
```

Open `http://localhost:5173` as an organizer user. Verify:
- Dashboard shows `Approvals | Volunteers` tabs (no Events tab)
- Volunteers tab shows loading skeleton then application list
- Approve button triggers RPC, card updates to approved + Undo button appears
- Reject button updates card to rejected + Undo button appears
- Undo (Revert) resets back to pending
- Empty state shows when no applications
- Pending stat in header reflects combined count

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/organizer/Dashboard.tsx
git commit -m "feat(organizer): replace Events tab with Volunteers tab in OrgDashboard"
```

---

## Task 5: Code review before Vercel deploy

- [ ] **Step 1: Run the code-reviewer agent**

Use `superpowers:requesting-code-review` skill — pass the branch `feat/volunteer-system` and the spec at `docs/superpowers/specs/2026-03-24-volunteer-system-design.md`.

- [ ] **Step 2: Address all critical/important feedback**

Fix any issues raised. Re-run typecheck after fixes.

- [ ] **Step 3: Final typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Merge to master + push**

```bash
git checkout master
git merge feat/volunteer-system
git push origin master
```

Vercel auto-deploys on push to master. Monitor deployment at https://vercel.com dashboard.
