# Markdown Description Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tab-based markdown editing to the event description field in EventCreate and EventEdit, and render stored markdown on both EventDetail pages.

**Architecture:** Two new components — `MarkdownContent` (a styled `react-markdown` renderer) and `MarkdownEditor` (a tab-based Edit/Preview wrapper for React Hook Form via `Controller`). Both organizer forms replace their plain `<textarea>` with `<Controller>` + `<MarkdownEditor>`. Both detail pages replace their `<p>` with `<MarkdownContent>`. The Zod max drops from 5,000 → 1,000 chars.

**Tech Stack:** `react-markdown` v9, `remark-gfm` v4, React Hook Form `Controller`, Tailwind CSS MD3 type scale tokens, TypeScript strict.

---

## File Map

| File | Action |
|------|--------|
| `apps/member/package.json` | Add `react-markdown`, `remark-gfm` |
| `apps/member/src/components/MarkdownContent.tsx` | **Create** — styled markdown renderer |
| `apps/member/src/components/MarkdownEditor.tsx` | **Create** — tab-based Edit/Preview field |
| `apps/member/src/pages/organizer/events/eventFormConstants.tsx:39` | Update description max 5000 → 1000 |
| `apps/member/src/pages/organizer/events/EventCreate.tsx:309-320` | Replace `<textarea>` with `<Controller>` + `<MarkdownEditor>` |
| `apps/member/src/pages/organizer/events/EventEdit.tsx:363-367` | Replace `<textarea>` with `<Controller>` + `<MarkdownEditor>` |
| `apps/member/src/pages/events/EventDetail.tsx:106-111` | Replace `<p>` with `<MarkdownContent>` |
| `apps/member/src/pages/organizer/events/EventDetail.tsx:124-127` | Replace `<p>` with `<MarkdownContent>` |

---

### Task 1: Install dependencies

**Files:**
- Modify: `apps/member/package.json`

- [ ] **Step 1: Install react-markdown and remark-gfm**

Run from the repo root (the workspace uses `--legacy-peer-deps` for all installs):

```bash
cd apps/member && npm install react-markdown remark-gfm --legacy-peer-deps
```

Expected: `package.json` gains `"react-markdown": "^9.x.x"` and `"remark-gfm": "^4.x.x"`. Both appear in `apps/member/node_modules/`.

- [ ] **Step 2: Typecheck — confirm TS can see the new types**

```bash
cd apps/member && npm run typecheck
```

Expected: exits 0. (The packages ship their own types — no `@types/` packages needed.)

- [ ] **Step 3: Commit**

```bash
git add apps/member/package.json apps/member/package-lock.json
git commit -m "chore: add react-markdown and remark-gfm"
```

---

### Task 2: Create MarkdownContent component

**Files:**
- Create: `apps/member/src/components/MarkdownContent.tsx`

This component is a thin styled wrapper around `react-markdown`. It defines all element overrides once and is reused in the Preview tab and both EventDetail pages.

- [ ] **Step 1: Create the file**

```tsx
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface MarkdownContentProps {
  value: string
  className?: string
}

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="text-md3-headline-sm font-bold text-slate-900 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-md3-title-md font-semibold text-slate-900 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-md3-body-md text-slate-600 leading-relaxed mb-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-4 text-md3-body-md text-slate-600 mb-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 text-md3-body-md text-slate-600 mb-2">{children}</ol>
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="font-mono text-md3-label-md bg-slate-100 px-1 rounded">{children}</code>
  ),
  img: () => null,
}

export function MarkdownContent({ value, className = '' }: MarkdownContentProps) {
  return (
    <div className={className}>
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {value}
      </Markdown>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/member && npm run typecheck
```

Expected: exits 0. If you see a complaint about `img: () => null` return type, change it to `img: () => null as unknown as null`.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/components/MarkdownContent.tsx
git commit -m "feat: add MarkdownContent markdown renderer component"
```

---

### Task 3: Create MarkdownEditor component

**Files:**
- Create: `apps/member/src/components/MarkdownEditor.tsx`

Tab state is local (`useState`) — it does not touch form state. `type="button"` on the tab buttons prevents them from submitting the form.

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react'
import { MarkdownContent } from './MarkdownContent'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string
  maxLength?: number
}

type EditorTab = 'edit' | 'preview'

export function MarkdownEditor({
  value,
  onChange,
  error,
  maxLength = 1000,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<EditorTab>('edit')
  const length = value.length
  const isOverLimit = length > maxLength

  return (
    <div>
      <div className="flex border-b-2 border-slate-200">
        <button
          type="button"
          onClick={() => setTab('edit')}
          className={`px-4 py-2 text-md3-label-md font-semibold rounded-t-md transition-colors ${
            tab === 'edit' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-4 py-2 text-md3-label-md font-semibold rounded-t-md transition-colors ${
            tab === 'preview' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Preview
        </button>
      </div>

      <div className="border border-t-0 border-slate-200 rounded-b-xl min-h-[120px]">
        {tab === 'edit' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            className="w-full p-3 font-mono text-sm text-slate-900 resize-none bg-transparent outline-none rounded-b-xl"
            placeholder="What is this event about? Markdown supported."
          />
        ) : (
          <div className="p-3 min-h-[120px]">
            {value.trim() ? (
              <MarkdownContent value={value} />
            ) : (
              <p className="text-md3-body-md text-slate-400 italic">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        {tab === 'edit' ? (
          <span className="text-md3-label-sm text-slate-400">
            {'**bold**'}&nbsp;&nbsp;{'_italic_'}&nbsp;&nbsp;{'## heading'}&nbsp;&nbsp;{'- list'}
          </span>
        ) : (
          <span />
        )}
        <span
          className={`text-md3-label-sm font-mono ${
            isOverLimit ? 'text-red font-semibold' : 'text-slate-400'
          }`}
        >
          {length} / {maxLength}
        </span>
      </div>

      {error && <p className="text-md3-label-md text-red mt-1">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/member && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/components/MarkdownEditor.tsx
git commit -m "feat: add MarkdownEditor tab-based field component"
```

---

### Task 4: Tighten description Zod schema

**Files:**
- Modify: `apps/member/src/pages/organizer/events/eventFormConstants.tsx:39`

- [ ] **Step 1: Update max length**

Find line 39:
```ts
description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be under 5000 characters'),
```

Replace with:
```ts
description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be under 1,000 characters'),
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/member && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/pages/organizer/events/eventFormConstants.tsx
git commit -m "feat: reduce description max to 1000 chars"
```

---

### Task 5: Wire MarkdownEditor into EventCreate

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventCreate.tsx:309-320`

`Controller` is already imported on line 6: `import { useForm, Controller } from 'react-hook-form'`. No import change needed for react-hook-form.

- [ ] **Step 1: Add MarkdownEditor import**

After the existing component imports at the top of `EventCreate.tsx`, add:
```tsx
import { MarkdownEditor } from '../../../components/MarkdownEditor'
```

- [ ] **Step 2: Confirm `control` is destructured from useForm**

Find the `useForm` call and confirm the destructure includes `control`:
```tsx
const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({ ... })
```

If `control` is missing from the destructure, add it.

- [ ] **Step 3: Replace the description textarea**

Find (lines 309-320):
```tsx
<div>
  <label className={labelClass}>Description</label>
  <textarea
    {...register('description')}
    rows={4}
    className={`${inputClass} resize-none`}
    placeholder="What is this event about?"
  />
  {errors.description && (
    <p className="text-md3-label-md text-red mt-1">{errors.description.message}</p>
  )}
</div>
```

Replace with:
```tsx
<div>
  <label className={labelClass}>Description</label>
  <Controller
    name="description"
    control={control}
    render={({ field }) => (
      <MarkdownEditor
        value={field.value}
        onChange={field.onChange}
        error={errors.description?.message}
      />
    )}
  />
</div>
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/member && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventCreate.tsx
git commit -m "feat: markdown description editor in EventCreate"
```

---

### Task 6: Wire MarkdownEditor into EventEdit

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventEdit.tsx:363-367`

`Controller` is already imported on line 6: `import { useForm, Controller } from 'react-hook-form'`.

- [ ] **Step 1: Add MarkdownEditor import**

```tsx
import { MarkdownEditor } from '../../../components/MarkdownEditor'
```

- [ ] **Step 2: Confirm `control` is destructured from useForm**

Same check as Task 5 — find the `useForm` destructure and confirm `control` is included. Add it if missing.

- [ ] **Step 3: Replace the description textarea**

Find (lines 363-367):
```tsx
<div>
  <label className={labelClass}>Description</label>
  <textarea {...register('description')} rows={4} className={`${inputClass} resize-none`} placeholder="What is this event about?" />
  {errors.description && <p className="text-md3-label-md text-red mt-1">{errors.description.message}</p>}
</div>
```

Replace with:
```tsx
<div>
  <label className={labelClass}>Description</label>
  <Controller
    name="description"
    control={control}
    render={({ field }) => (
      <MarkdownEditor
        value={field.value}
        onChange={field.onChange}
        error={errors.description?.message}
      />
    )}
  />
</div>
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/member && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventEdit.tsx
git commit -m "feat: markdown description editor in EventEdit"
```

---

### Task 7: Render markdown in member EventDetail

**Files:**
- Modify: `apps/member/src/pages/events/EventDetail.tsx:106-111`

- [ ] **Step 1: Add MarkdownContent import**

```tsx
import { MarkdownContent } from '../../components/MarkdownContent'
```

- [ ] **Step 2: Replace the description paragraph**

Find (lines 106-111):
```tsx
{event.description && (
  <div>
    <h2 className="text-md3-body-md font-bold text-slate-900 mb-1">About</h2>
    <p className="text-md3-body-md text-slate-600 leading-relaxed">{event.description}</p>
  </div>
)}
```

Replace with:
```tsx
{event.description && (
  <div>
    <h2 className="text-md3-body-md font-bold text-slate-900 mb-1">About</h2>
    <MarkdownContent value={event.description} />
  </div>
)}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/member && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/events/EventDetail.tsx
git commit -m "feat: render description as markdown in member EventDetail"
```

---

### Task 8: Render markdown in organizer EventDetail

**Files:**
- Modify: `apps/member/src/pages/organizer/events/EventDetail.tsx:124-127`

- [ ] **Step 1: Add MarkdownContent import**

```tsx
import { MarkdownContent } from '../../../components/MarkdownContent'
```

- [ ] **Step 2: Replace the description paragraph**

Find (lines 124-127):
```tsx
<div className="border-t border-slate-100 pt-4">
  <p className="text-md3-label-md font-bold uppercase tracking-wide text-slate-400 mb-2">About</p>
  <p className="text-md3-body-md text-slate-600 leading-relaxed">{event.description}</p>
</div>
```

Replace with:
```tsx
<div className="border-t border-slate-100 pt-4">
  <p className="text-md3-label-md font-bold uppercase tracking-wide text-slate-400 mb-2">About</p>
  <MarkdownContent value={event.description ?? ''} />
</div>
```

Note: `event.description` is `string | null` from the DB schema — `?? ''` passes an empty string so `MarkdownContent` always receives a `string`.

- [ ] **Step 3: Typecheck**

```bash
cd apps/member && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/pages/organizer/events/EventDetail.tsx
git commit -m "feat: render description as markdown in organizer EventDetail"
```

---

### Task 9: Full build verification + smoke test

- [ ] **Step 1: Typecheck all packages**

```bash
npm run typecheck
```

Expected: exits 0, zero errors across all packages.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: exits 0. This mirrors Vercel's exact build command (`tsc -b && vite build`). Any failure here is a deployment blocker — fix before proceeding.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev:member
```

Sign in as a chapter officer, then:

1. `/organizer/events/create` — type in description field:
   ```
   ## Test Event
   **Bold text** and _italic text_
   - Item one
   - Item two
   ```
2. Click **Preview** tab — confirm heading, bold, italic, and bullet list render correctly.
3. Verify character counter shows `N / 1000`.
4. Paste a 1,001-character string — counter turns red; submit attempt shows "Description must be under 1,000 characters".
5. Submit a valid form → navigate to the created event's member EventDetail (`/events/:slug`) — confirm "About" section shows rendered markdown (not raw `##` syntax).
6. Navigate to organizer EventDetail (`/organizer/events/:id`) — confirm same rendered output.
7. Open `/organizer/events/:id/edit` — confirm the saved markdown text appears correctly in the **Edit** tab textarea.
