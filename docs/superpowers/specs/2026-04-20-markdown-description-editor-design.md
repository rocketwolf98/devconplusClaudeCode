# Markdown Description Editor — Design Spec
**Date:** 2026-04-20
**Status:** Approved

---

## Problem

Event descriptions are currently stored and displayed as plain text. Organizers have no way to structure content (headings, bullet lists, bold text) and the EventDetail pages render everything as a flat paragraph — hurting readability for events with agendas or multi-part information.

## Goal

Add markdown editing support to the description field in both EventCreate and EventEdit. Render the stored markdown in EventDetail pages (member-facing and organizer-facing).

---

## Decisions

| Question | Decision |
|----------|----------|
| Editor UX | Tab-based: **Edit** tab (textarea) / **Preview** tab (rendered markdown) |
| Scope | Both `EventCreate.tsx` and `EventEdit.tsx` |
| EventDetail rendering | Yes — both member and organizer detail pages |
| Character limit | **1,000 chars** (down from 5,000), with live counter |
| Markdown library | `react-markdown` + `remark-gfm` |

---

## Architecture

### New components (both in `apps/member/src/components/`)

#### `MarkdownEditor`
A reusable controlled component that wraps a description field with tab-based edit/preview. Integrates with React Hook Form via the `Controller` component.

Props:
```ts
interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string
  maxLength?: number  // defaults to 1000
}
```

Behaviour:
- **Edit tab** (default): textarea with `font-mono`, `resize-none`, 5 rows. Tab control row sits above with `bg-primary` fill on the active tab.
- **Preview tab**: renders `<MarkdownContent value={value} />` inside the same bordered container. If value is empty, shows a muted placeholder "Nothing to preview yet."
- **Character counter**: always visible below the field — `{length} / {maxLength}`. Counter turns `text-red` when over limit.
- **Syntax hint**: small muted line in Edit tab only — `**bold**  _italic_  ## heading  - list`
- Tab state is local (`useState`) — does not affect form state.

#### `MarkdownContent`
A thin, styled wrapper around `react-markdown` + `remark-gfm` for consistent rendering everywhere.

Props:
```ts
interface MarkdownContentProps {
  value: string
  className?: string
}
```

Supported markdown (via GFM):
- Headings `##`, `###`
- Bold `**`, italic `_`
- Unordered and ordered lists
- Inline `code`
- ~~Strikethrough~~
- Links (rendered as `text-primary underline`)

Disabled / stripped:
- Raw HTML (react-markdown disables by default — no change needed)
- Images (`components` override removes `img` elements)

Prose styles applied via Tailwind classes on the component wrappers:
```
h2 → text-md3-headline-sm font-bold text-slate-900 mb-2
h3 → text-md3-title-md font-semibold text-slate-900 mb-1
p  → text-md3-body-md text-slate-600 leading-relaxed mb-2
ul/ol → list-disc/list-decimal pl-4 text-md3-body-md text-slate-600 mb-2
strong → font-bold
em → italic
a  → text-primary underline
code → font-mono text-md3-label-md bg-slate-100 px-1 rounded
```

---

## File Changes

| File | Change |
|------|--------|
| `apps/member/package.json` | Add `react-markdown` and `remark-gfm` |
| `apps/member/src/components/MarkdownEditor.tsx` | **New** — tab-based editor component |
| `apps/member/src/components/MarkdownContent.tsx` | **New** — markdown renderer component |
| `apps/member/src/pages/organizer/events/eventFormConstants.tsx` | Update `description` max from 5000 → 1000 |
| `apps/member/src/pages/organizer/events/EventCreate.tsx` | Replace `<textarea>` with `<Controller>` + `<MarkdownEditor>` |
| `apps/member/src/pages/organizer/events/EventEdit.tsx` | Replace `<textarea>` with `<Controller>` + `<MarkdownEditor>` |
| `apps/member/src/pages/events/EventDetail.tsx` | Replace `<p>{event.description}</p>` with `<MarkdownContent>` |
| `apps/member/src/pages/organizer/events/EventDetail.tsx` | Replace `<p>{event.description}</p>` with `<MarkdownContent>` |

---

## Styling Notes

- Active tab: `bg-primary text-white rounded-t-md` — inherits CSS custom property theme
- Inactive tab: `text-slate-400 hover:text-slate-700`
- Tab row border-bottom: `border-b-2 border-slate-200` — field container continues below with `border border-t-0 border-slate-200 rounded-b-xl`
- Textarea in Edit mode: `font-mono text-sm` for legible markdown syntax
- No framer-motion on the tab switch — instant swap is intentional (avoids layout shift on preview render)

---

## Backward Compatibility

Existing event descriptions stored as plain text are valid markdown — they render as plain paragraphs with no visual change. No data migration is needed.

The 1,000-char limit only applies at form submission time (Zod validation). Existing descriptions over 1,000 chars in the DB are still stored and rendered correctly; they would only be rejected if an organizer tries to save a new edit that exceeds the limit.

---

## Verification

1. `npm run dev:member` — open EventCreate, type markdown in description field
2. Click Preview tab — confirm rendered output matches Edit content
3. Submit the form — confirm the raw markdown string is saved to Supabase `events.description`
4. Navigate to member EventDetail — confirm description renders as formatted markdown
5. Navigate to organizer EventDetail — confirm same
6. Test character counter: paste 1001-char string — counter goes red, Zod rejects on submit
7. `npm run typecheck` — must pass clean
8. `npm run build` — must pass clean (mirrors Vercel)
