# Architectural Decision Records (ADRs)

This folder contains all Architectural Decision Records for **DEVCON+**.

An ADR captures a significant technical or product decision: **what** was decided, **why**, and **what trade-offs** were accepted. They are immutable historical records — when a decision changes, we write a *new* ADR that supersedes the old one.

---

## Why We Use ADRs

DEVCON+ is built by a small intern team with AI assistance (Claude Code / Gemini). Decisions that feel obvious today become invisible in two weeks — especially across developer handovers. ADRs ensure that:

- The *next developer* can understand why the codebase looks the way it does.
- We don't relitigate settled decisions.
- Trade-offs are visible, not hidden in Slack threads or meeting notes.

---

## Format

Each ADR is a Markdown file with this structure:

```markdown
# XXXX — Title of Decision

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Deprecated | Superseded by [ADR-XXXX](./XXXX-title.md)
- **Deciders:** (names or roles)

## Context

What problem are we solving? What constraints or forces are at play?

## Decision

What did we decide to do? Be specific.

## Consequences

What becomes easier? What becomes harder? What do we accept as trade-offs?
```

---

## Naming Convention

```
XXXX-kebab-case-title.md
```

Use a 4-digit zero-padded sequential ID. Example: `0003-use-zustand-for-state.md`

---

## When to Write an ADR

Write one when you are making a decision that:

- Picks a library, framework, or service for a significant concern (auth, state, routing, DB)
- Changes how a core pattern works (e.g. theming, real-time, form handling)
- Defers a feature intentionally (e.g. "we won't do X until Phase 2, because...")
- Involves a meaningful trade-off the team debated

You do **not** need an ADR for component-level implementation choices, naming conventions, or things covered by `CLAUDE.md`.

---

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [0001](./0001-record-architecture-decisions.md) | Record Architecture Decisions | Accepted | 2026-04-26 |
| [0002](./0002-migrate-from-expo-to-react-vite-pwa.md) | Migrate member app from Expo to React + Vite PWA | Accepted | 2026-02-27 |
| [0003](./0003-use-supabase-as-backend.md) | Use Supabase as the unified backend | Accepted | 2026-03-29 |
| [0004](./0004-single-codebase-three-route-trees.md) | Single codebase for Member, Organizer, and Admin UIs | Accepted | 2026-03-29 |
| [0005](./0005-defer-native-app-to-phase-2.md) | Defer native app (KMP) to Phase 2 | Accepted | 2026-04-15 |
