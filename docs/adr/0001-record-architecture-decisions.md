# 0001 — Record Architecture Decisions

- **Date:** 2026-04-26
- **Status:** Accepted
- **Deciders:** Kenshin, Kien

---

## Context

DEVCON+ is built by a two-person intern team under a hard deadline (April 30, 2026 dev freeze) with heavy AI assistance from Claude Code. Decisions are made quickly and are not always documented beyond implementation-level comments in `CLAUDE.md`.

As the project approaches handover to the next developer (or team), there is a risk that the reasoning behind significant architectural choices is lost — leaving a codebase that is hard to understand, modify safely, or hand off.

---

## Decision

We will use **Markdown Architectural Decision Records** stored in `docs/adr/` to document significant technical decisions made in this project.

- Each ADR is a single Markdown file in `docs/adr/` following the format defined in `docs/adr/README.md`.
- ADRs are numbered sequentially (`0001`, `0002`, …).
- ADRs are **never deleted** — when a decision is reversed, a new ADR is written that supersedes the old one.
- The `docs/adr/README.md` index is updated when a new ADR is added.

---

## Consequences

**Easier:**
- New developers or next cohort interns can understand *why* the codebase is structured the way it is, not just *how*.
- Prevents relitigating settled decisions (e.g. "why aren't we using Expo?").
- Useful context for AI tools like Claude Code or Gemini CLI when fed as context.

**Harder:**
- Small overhead of writing the ADR when a major decision is made.
- Index in `README.md` must be manually updated.

**Trade-off accepted:**
- ADRs only need to be written for significant decisions — not every component-level choice. `CLAUDE.md` continues to serve as the living operational reference. ADRs are the historical record of *why* it ended up that way.
