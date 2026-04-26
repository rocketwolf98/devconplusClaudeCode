# 0004 — Single Codebase for Member, Organizer, and Admin UIs

- **Date:** 2026-03-29
- **Status:** Accepted
- **Deciders:** Kenshin, Kien

---

## Context

DEVCON+ has three distinct user experiences, each with its own navigation, guards, and design language:

1. **Member UI** — mobile-first, floating pill bottom nav, program theme support (`--color-primary` CSS var)
2. **Organizer UI** — chapter officer tools, same responsive pattern, different nav, no program themes
3. **Admin UI** — HQ/super admin panel, desktop-only sidebar, `hq_admin`/`super_admin` guard

The team considered maintaining these as separate apps (e.g. `apps/member/`, `apps/organizer/`, `apps/admin/`) in the Turbo monorepo. An early `apps/organizer/` app did exist briefly before this decision was made.

---

## Decision

Consolidate all three UI experiences into **a single app** at `apps/member/`, using **three separate route trees** under one `createBrowserRouter`:

```
/home, /events/*, /jobs/*, /points/*, /rewards, /profile/*   →  MemberLayout
/organizer/*                                                   →  OrganizerLayout
/admin/*                                                       →  AdminLayout
```

Each layout is an independent React tree with its own auth guard, navigation, and theme behavior. **Components are never shared between layout trees** — only utility components (`<ComingSoonModal />`, `<Skeleton />`, `<StatusPill />`, etc.) are shared.

---

## Consequences

**Easier:**
- Single `npm run dev:member` and single Vercel deployment covers all three experiences.
- Shared utility components (`<Skeleton />`, `<ComingSoonModal />`, `<StatusPill />`) are imported directly without a cross-package reference.
- Supabase client, stores, and types are shared within one `src/` tree — no workspace package needed for the UI layer.
- One `tailwind.config.js` and one `index.css` — the design system is always in sync.

**Harder:**
- The codebase is larger than a focused single-purpose app. A developer who only needs to work on the Organizer UI must still understand the full project structure.
- It's easy to accidentally import a `MemberLayout`-specific component into `OrganizerLayout` or vice versa. This must be caught in code review. The rule is documented in `CLAUDE.md` Rule #7.
- `AdminLayout` is desktop-only, but the rest of the app is mobile-first — the responsive breakpoint behavior is different per layout, which can be surprising.

**Trade-off accepted:**
- The consolidation is net positive for the team's delivery speed. The risk of cross-tree component leakage is mitigated by code review and the explicit rule in `CLAUDE.md`. A future team could extract the admin panel into its own app if complexity warrants it (write a new ADR if that happens).
