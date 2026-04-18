# DEVCON+ — Agentic Skills
> Structured Claude Code workflows for common recurring tasks.
> When asked to perform one of these operations, execute the full workflow below — don't improvise.

---

## Skill 1: `SchemaUpdate` — Add or Modify a Database Table/Column

Use when: adding a new table, adding a column, changing a constraint, or seeding new data.

### Workflow

**Step 1 — Write the migration SQL**
```bash
# Create a new migration file with today's date and a descriptive name
# Pattern: supabase/migrations/YYYYMMDD_description.sql
```
- Include `CREATE TABLE` or `ALTER TABLE` statement
- Add RLS: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
- Add at minimum one policy — even if it's "service role only"
- Add performance indexes for foreign keys and commonly filtered columns
- Seed data if applicable

**Step 2 — Apply the migration**
```bash
# Via Supabase CLI:
supabase db push

# Or paste directly in Supabase Dashboard → SQL Editor
```

**Step 3 — Regenerate TypeScript types**
```bash
supabase gen types typescript --project-id <project-ref> \
  > packages/supabase/src/database.types.ts
```

**Step 4 — Verify downstream consumers**
```bash
npm run typecheck
# Fix any type errors — the generated types may rename or add fields
```

**Step 5 — Update stores if needed**
- If new table: create a new Zustand store in `apps/member/src/stores/`
- If modified table: update the relevant store's select query and TypeScript types
- If the store uses Realtime: implement the two-layer recovery pattern (see `.claude/rules/db-connection-resilience.md`)

**Step 6 — Verify build**
```bash
npm run build
```

**Checklist before done:**
- [ ] Migration file created with date prefix
- [ ] RLS enabled on new table
- [ ] At least one RLS policy defined
- [ ] `database.types.ts` regenerated
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run build` succeeds

---

## Skill 2: `NewPageRoute` — Add a New Page and Route

Use when: creating a new screen accessible via a URL.

### Workflow

**Step 1 — Create the page component**

Determine which layout tree it belongs to:
- Member experience → `apps/member/src/pages/` (e.g., `profile/NewPage.tsx`)
- Organizer experience → `apps/member/src/pages/organizer/OrgNewPage.tsx`
- Admin experience → `apps/member/src/pages/admin/AdminNewPage.tsx`

Component template:
```tsx
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animation'

export default function NewPage() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="px-4 pb-24"
    >
      {/* content */}
    </motion.div>
  )
}
```

Rules:
- Every async call needs loading + error + empty state
- Use `<Skeleton />` for loading
- Use `<ComingSoonModal />` for incomplete sub-features
- No dead-end navigation — every action resolves somewhere

**Step 2 — Register the route in router.tsx**
```tsx
// apps/member/src/router.tsx
// Add inside the appropriate layout's children array:
{
  path: '/new-path',
  element: <NewPage />,
  // For large components (admin, QR scanner): lazy-load
  // element: React.lazy(() => import('./pages/NewPage'))
}
```

**Step 3 — Wire up navigation**
- Add a link from wherever users will discover this page
- If it's in the bottom nav: update the nav array in `MemberLayout.tsx` or `OrganizerLayout.tsx`
- Run the app and confirm the route is reachable and has no console errors

**Step 4 — Verify**
```bash
npm run typecheck
npm run build
```

**Checklist before done:**
- [ ] Component uses `fadeUp` or appropriate animation variant from `lib/animation.ts`
- [ ] Loading, error, and empty states handled
- [ ] Route registered in `router.tsx` under the correct layout
- [ ] Navigation to/from this page is not a dead-end
- [ ] `npm run typecheck` passes

---

## Skill 3: `EdgeFunctionUpdate` — Modify or Deploy an Edge Function

Use when: updating business logic in `supabase/functions/`, adding a new edge function, or updating the CORS allowlist.

### Workflow

**Step 1 — Make the code change**

Edge functions are in `supabase/functions/<function-name>/index.ts` (Deno runtime).

Key patterns:
- Always import the shared logger: `import { log } from '../_shared/logger.ts'`
- Always return CORS headers using the shared helper in `_shared/cors.ts`
- Rate limit sensitive endpoints using the `check-rate-limit` function pattern
- Use `log.info()`, `log.warn()`, `log.error()` — never `console.log()` directly

**Step 2 — Test locally (optional but recommended)**
```bash
supabase functions serve <function-name> --env-file supabase/.env
# Then hit it with curl or the app in dev mode
```

**Step 3 — Deploy**
```bash
supabase functions deploy <function-name>

# If you updated _shared/cors.ts or _shared/logger.ts,
# ALL functions share the same _shared/ directory —
# you must redeploy EVERY function:
supabase functions deploy generate-qr-token
supabase functions deploy award-points-on-scan
supabase functions deploy approve-at-door
supabase functions deploy check-rate-limit
supabase functions deploy generate-user-qr
```

**Step 4 — Verify in Supabase Dashboard**
- Go to Edge Functions → click the function name → check the logs
- Trigger the function from the app and confirm the response

**Step 5 — If adding a new domain to CORS allowlist**
```ts
// supabase/functions/_shared/cors.ts
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://devconplusbeta-v1.vercel.app',
  'https://plus-beta.devcon.ph',  // add new domain here
]
```
Then redeploy all 5 functions.

**Checklist before done:**
- [ ] Uses shared logger, not `console.log()`
- [ ] Returns CORS headers on all responses (including error paths)
- [ ] Rate limiting applied if the function handles user actions
- [ ] Function deployed and visible in Supabase Dashboard
- [ ] Verified with a real request from the app

---

## Skill 4: `SecurityAudit` — OWASP Top 10 Review Pass

Use when: preparing for launch, after adding new auth flows, or after adding new user-facing endpoints.

### Workflow

Work through each category. Document findings as: **[PASS / FAIL / PARTIAL]** with a one-line note.

**A01 — Broken Access Control**
- [ ] Every Supabase table with user data has RLS enabled
- [ ] Organizer-only routes check `role IN ('chapter_officer', 'hq_admin', 'super_admin')` via `OrganizerLayout` guard
- [ ] Admin routes check `role IN ('hq_admin', 'super_admin')` via `AdminLayout` guard
- [ ] Edge functions that touch protected data validate the JWT via `supabase.auth.getUser()`
- [ ] No route allows a member to view another member's registrations or points

**A02 — Cryptographic Failures**
- [ ] QR tokens are HMAC-SHA256 signed (not just base64 encoded)
- [ ] QR tokens have short expiry (verify in `generate-qr-token`)
- [ ] No sensitive data (service role key, JWT secret) in client-side code or git
- [ ] HTTPS enforced on production (Vercel handles this)

**A03 — Injection**
- [ ] All Supabase queries use parameterized queries (the SDK handles this)
- [ ] No raw SQL constructed from user input in edge functions
- [ ] Zod validation on all form inputs before DB writes

**A05 — Security Misconfiguration**
- [ ] CSP headers enforced (promoted from Report-Only in April)
- [ ] Supabase anon key is the only key exposed to the browser (not service role)
- [ ] `VITE_APP_ENV` is `production` in Vercel (not `development`)
- [ ] Cloudflare Turnstile token is validated server-side (not just checked for presence)

**A07 — Identification and Authentication Failures**
- [ ] Rate limiting on login, signup, password reset (via `check-rate-limit`)
- [ ] Cloudflare Turnstile on all auth forms
- [ ] Google OAuth redirect URI is restricted to known domains in GCP Console
- [ ] Session tokens are managed by Supabase Auth (not custom implementation)

**A09 — Security Logging and Monitoring**
- [ ] All edge functions log using `_shared/logger.ts` (structured JSON to Supabase Dashboard)
- [ ] Rate limit violations are logged with `log.warn()`
- [ ] Failed QR scans (invalid token, already checked in) are logged

**After audit:** Fix all FAIL findings before marking complete. PARTIAL findings should have a GitHub issue created with priority.

---

## Skill 5: `RealtimeStoreAdd` — Add a New Zustand Store with Supabase Realtime

Use when: a new domain needs live-updating data (not just one-time fetches).

### Workflow

This is the most accident-prone task in the codebase — the two-layer recovery pattern is easy to get wrong.

**Step 1 — Create the store file**

```ts
// apps/member/src/stores/useNewDomainStore.ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface NewDomainStore {
  items: Item[]
  isLoading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  subscribeToChanges: () => () => void  // returns cleanup function
}

export const useNewDomainStore = create<NewDomainStore>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase.from('table_name').select('*')
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ items: data ?? [], isLoading: false })
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('new-domain-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'table_name',
      }, () => {
        void useNewDomainStore.getState().fetchItems()
      })
      .subscribe((status, err) => {
        // Required — log channel errors per db-connection-resilience.md
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[new-domain] channel error', status, err)
        }
      })

    // Required — return cleanup function
    return () => { void supabase.removeChannel(channel) }
  },
}))
```

**Step 2 — Wire into the layout's recovery pattern**

Open `MemberLayout.tsx` (or `OrganizerLayout.tsx` for organizer data):

```ts
// In the recover() function — add HTTP refetch
const recover = useCallback(async () => {
  await Promise.all([
    fetchEvents(),
    fetchRewards(),
    fetchNewDomainItems(),  // ← add this
  ])
}, [...])

// In the resubscribe() function — add channel teardown + recreation
const resubscribe = useCallback(() => {
  cleanupEvents?.()
  cleanupRewards?.()
  cleanupNewDomain?.()  // ← add this
  setCleanupEvents(subscribeToEventChanges())
  setCleanupRewards(subscribeToRewardsChanges())
  setCleanupNewDomain(subscribeToNewDomainChanges())  // ← add this
}, [...])
```

**Step 3 — Verify the recovery is wired to all three trigger points**

```bash
# Check these three exist in MemberLayout.tsx:
grep -n "recover()" apps/member/src/components/MemberLayout.tsx
grep -n "resubscribe()" apps/member/src/components/MemberLayout.tsx
# Should see 3 calls to each: visibilitychange, online event, setInterval
```

**Step 4 — Verify**
```bash
npm run typecheck
npm run build
# Manually test: load the page, put the tab in background for 2 minutes, return — data should refresh
```

**Checklist before done:**
- [ ] Store has `subscribeToChanges()` returning a cleanup function
- [ ] `subscribe()` status callback logs `CHANNEL_ERROR` and `TIMED_OUT`
- [ ] `fetchItems()` is called in layout's `recover()` function
- [ ] `subscribeToChanges()` teardown + recreation is in layout's `resubscribe()` function
- [ ] `resubscribe()` is called on `visibilitychange`, `online` event, and `setInterval`
- [ ] `npm run typecheck` passes
