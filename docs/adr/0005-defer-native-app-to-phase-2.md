# 0005 — Defer Native App (Kotlin Multiplatform) to Phase 2

- **Date:** 2026-04-15
- **Status:** Accepted
- **Deciders:** Kenshin, Kien, DEVCON HQ

---

## Context

DEVCON+ is ultimately intended to reach members on their phones as a first-class native application. A native Android + iOS app (rather than a PWA) would unlock:
- Native push notifications (FCM / APNs)
- Background sync
- App Store/Play Store discoverability
- Smooth platform-native animations and gestures

**Kotlin Multiplatform (KMP)** was identified as the preferred path — it allows sharing business logic (data layer, domain models, API clients) between Android and iOS targets while writing platform-appropriate UIs.

However, as of April 2026:
- The intern team's primary expertise is in React + TypeScript, not Kotlin.
- The **April 30 dev freeze** and **May 15 public preview** deadlines make any native rewrite impossible in scope.
- The current web app's architecture (Zustand stores → Supabase) maps cleanly to Kotlin equivalents (ViewModel + StateFlow → Supabase Kotlin SDK), making the migration path well-defined for a future team.

---

## Decision

**Defer the KMP native app to Phase 2.** The MVP (Cohort 3 graduation deadline) will ship as a **PWA on Vercel** (see ADR-0002).

The architecture of the current web app is intentionally kept **migration-friendly**:
- Stores in `apps/member/src/stores/` have a clear domain boundary (one store per concern) that maps to ViewModels.
- All data access is through the Supabase client — the Supabase Kotlin SDK provides equivalent APIs.
- No UI-layer logic is embedded in stores (stores only manage data state, not navigation or layout).

Phase 2 KMP work is tracked in [`PRD.md` Section 4](../../PRD.md#4-what-comes-next-phase-2).

---

## Consequences

**Easier:**
- The intern team can focus entirely on delivering a polished, secure web app before the deadline.
- PWA "Add to Home Screen" provides a near-native mobile UX without App Store submission.
- No Kotlin toolchain setup, Gradle, or Android Studio required for the current team.

**Harder:**
- Native push notifications are not available in the MVP (Web Push is a partial mitigation but has poor iOS Safari support pre-iOS 16.4).
- Supabase WebSocket resilience on mobile Safari remains a known issue (see `.claude/rules/db-connection-resilience.md`) that a native app would not have.
- App Store / Play Store discoverability is zero until Phase 2 ships.

**Trade-off accepted:**
- DEVCON+ events are the primary access trigger — members open the app when they arrive at an event, not as an always-on app. PWA UX is sufficient for this access pattern. The cost of delaying native (reduced discoverability, no push) is lower than the cost of missing the May 15 preview deadline.
