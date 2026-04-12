# Solar Icon Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `lucide-react` icon imports across 66 files in `apps/member/` with `solar-icon-set` outline variants, and replace the `LucideIcon` type with a shared `SolarIcon` type alias.

**Architecture:** A Node.js migration script encodes the full lucide→solar mapping table and rewrites all import statements and JSX usages in one pass. The `LucideIcon` type (2 files) is replaced manually before the script runs. After the script, `lucide-react` is uninstalled and TypeScript typecheck confirms zero remaining references.

**Tech Stack:** `solar-icon-set`, TypeScript strict mode, Node.js (migration script), Vite, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/member/src/lib/icons.ts` | **Create** | `SolarIcon` type alias — shared across all components |
| `apps/member/src/components/OrganizerLayout.tsx` | **Modify** | Replace `LucideIcon` type import |
| `apps/member/src/pages/points/Points.tsx` | **Modify** | Replace `LucideIcon` type import |
| `scripts/migrate-icons.mjs` | **Create** | Migration script — rewrites all icon imports + usages |
| `apps/member/package.json` | **Modify** | Add `solar-icon-set`, remove `lucide-react` |
| All 66 `.tsx`/`.ts` files in `apps/member/src/` | **Modified by script** | Icon import + usage replacement |

---

## Task 1: Install `solar-icon-set` and verify export names

**Files:**
- Modify: `apps/member/package.json`
- Create: `scripts/verify-solar-exports.mjs` (temporary, delete after)

- [ ] **Step 1: Install the package**

Run from repo root:
```bash
cd apps/member && npm install solar-icon-set --legacy-peer-deps && cd ../..
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-solar-exports.mjs`:
```js
import * as Solar from '../apps/member/node_modules/solar-icon-set/index.js'

const expected = [
  'AlertCircleOutline', 'DangerTriangleOutline', 'ArchiveOutline',
  'ArrowLeftOutline', 'AtSignOutline', 'TrophyOutline',
  'BellOutline', 'BellOffOutline', 'BriefcaseOutline',
  'BuildingsOutline', 'CalendarOutline', 'CalendarRemoveOutline',
  'CalendarAddOutline', 'CameraOutline', 'CheckOutline',
  'CheckCircleOutline', 'AltArrowDownOutline', 'AltArrowRightOutline',
  'AltArrowUpOutline', 'ClipboardListOutline', 'ClockCircleOutline',
  'CopyOutline', 'DownloadOutline', 'ShareOutline',
  'EyeOutline', 'EyeClosedOutline', 'FireOutline',
  'GiftOutline', 'HeartOutline', 'HomeOutline',
  'GalleryAddOutline', 'InfoCircleOutline', 'KeyOutline',
  'WidgetsOutline', 'LinkOutline', 'SpinnerOutline',
  'LogoutOutline', 'LetterOutline', 'MapPointOutline',
  'MegaphoneOutline', 'MonitorOutline', 'NewspaperOutline',
  'BoxOutline', 'PenOutline', 'PhoneOutline',
  'AddOutline', 'QrCodeOutline', 'RefreshOutline',
  'RocketOutline', 'RestartOutline', 'ScanBarcodeOutline',
  'MagnifierBugOutline', 'ShieldOutline', 'ShieldCheckOutline',
  'StarOutline', 'CameraRotationOutline', 'TagOutline',
  'TicketOutline', 'ToggleOffOutline', 'ToggleOnOutline',
  'TrashBinTrashOutline', 'UserOutline', 'UserCheckOutline',
  'UserCrossOutline', 'UsersGroupRoundedOutline', 'CloseSquareOutline',
  'CloseCircleOutline', 'BoltOutline',
]

const missing = expected.filter(name => !(name in Solar))
if (missing.length === 0) {
  console.log('✅ All Solar export names verified.')
} else {
  console.error('❌ Missing exports:', missing)
  process.exit(1)
}
```

- [ ] **Step 3: Run the verification script**

```bash
node scripts/verify-solar-exports.mjs
```

Expected: `✅ All Solar export names verified.`

If any names are missing, check the actual exports:
```bash
node -e "import('../apps/member/node_modules/solar-icon-set/index.js').then(m => console.log(Object.keys(m).filter(k => k.endsWith('Outline')).sort().join('\n')))"
```

Update the mapping table in the design spec AND in Task 3's migration script before continuing.

- [ ] **Step 4: Delete the verification script**

```bash
rm scripts/verify-solar-exports.mjs
```

- [ ] **Step 5: Commit**

```bash
git add apps/member/package.json apps/member/package-lock.json
git commit -m "chore: install solar-icon-set"
```

---

## Task 2: Create `lib/icons.ts` with `SolarIcon` type

**Files:**
- Create: `apps/member/src/lib/icons.ts`

- [ ] **Step 1: Create the file**

Create `apps/member/src/lib/icons.ts`:
```ts
import type { ComponentType, SVGProps } from 'react'

export type SolarIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
```

- [ ] **Step 2: Verify it typechecks**

```bash
npm run typecheck
```

Expected: same error count as before (no new errors introduced).

- [ ] **Step 3: Commit**

```bash
git add apps/member/src/lib/icons.ts
git commit -m "feat: add SolarIcon type alias in lib/icons.ts"
```

---

## Task 3: Replace `LucideIcon` type in the 2 affected files

**Files:**
- Modify: `apps/member/src/components/OrganizerLayout.tsx`
- Modify: `apps/member/src/pages/points/Points.tsx`

- [ ] **Step 1: Update `OrganizerLayout.tsx`**

Find line:
```ts
import type { LucideIcon } from 'lucide-react'
```

Replace with:
```ts
import type { SolarIcon } from '../lib/icons'
```

Find all occurrences of `LucideIcon` in the same file and replace with `SolarIcon`. There are 2 occurrences in the nav tab type definitions on lines ~14 and ~19.

- [ ] **Step 2: Update `Points.tsx`**

Find line:
```ts
import type { LucideIcon } from 'lucide-react'
```

Replace with:
```ts
import type { SolarIcon } from '../../lib/icons'
```

Find all occurrences of `LucideIcon` in the same file and replace with `SolarIcon`. There are 2 occurrences in the `EARN` and `SHARE` array type definitions on lines ~16 and ~24.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: `LucideIcon` no longer appears in errors. (There will still be lucide import errors from the other 66 files — that's fine, the script handles those next.)

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/components/OrganizerLayout.tsx apps/member/src/pages/points/Points.tsx
git commit -m "refactor: replace LucideIcon type with SolarIcon"
```

---

## Task 4: Write the migration script

**Files:**
- Create: `scripts/migrate-icons.mjs`

- [ ] **Step 1: Create the migration script**

Create `scripts/migrate-icons.mjs`:
```js
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

// Full lucide → solar mapping
const ICON_MAP = {
  AlertCircle:    'AlertCircleOutline',
  AlertTriangle:  'DangerTriangleOutline',
  Archive:        'ArchiveOutline',
  ArrowLeft:      'ArrowLeftOutline',
  AtSign:         'AtSignOutline',
  Award:          'TrophyOutline',
  Bell:           'BellOutline',
  BellOff:        'BellOffOutline',
  Briefcase:      'BriefcaseOutline',
  Building2:      'BuildingsOutline',
  Calendar:       'CalendarOutline',
  CalendarDays:   'CalendarOutline',
  CalendarOff:    'CalendarRemoveOutline',
  CalendarPlus:   'CalendarAddOutline',
  CalendarX:      'CalendarRemoveOutline',
  Camera:         'CameraOutline',
  Check:          'CheckOutline',
  CheckCircle:    'CheckCircleOutline',
  CheckCircle2:   'CheckCircleOutline',
  ChevronDown:    'AltArrowDownOutline',
  ChevronRight:   'AltArrowRightOutline',
  ChevronUp:      'AltArrowUpOutline',
  ClipboardList:  'ClipboardListOutline',
  Clock:          'ClockCircleOutline',
  Copy:           'CopyOutline',
  Download:       'DownloadOutline',
  ExternalLink:   'ShareOutline',
  Eye:            'EyeOutline',
  EyeOff:         'EyeClosedOutline',
  Flame:          'FireOutline',
  Gift:           'GiftOutline',
  Heart:          'HeartOutline',
  Home:           'HomeOutline',
  ImagePlus:      'GalleryAddOutline',
  Info:           'InfoCircleOutline',
  KeyRound:       'KeyOutline',
  LayoutDashboard:'WidgetsOutline',
  Link2:          'LinkOutline',
  Loader2:        'SpinnerOutline',
  LogOut:         'LogoutOutline',
  Mail:           'LetterOutline',
  MapPin:         'MapPointOutline',
  Megaphone:      'MegaphoneOutline',
  Monitor:        'MonitorOutline',
  Newspaper:      'NewspaperOutline',
  Package:        'BoxOutline',
  Pencil:         'PenOutline',
  Phone:          'PhoneOutline',
  Plus:           'AddOutline',
  QrCode:         'QrCodeOutline',
  RefreshCw:      'RefreshOutline',
  Rocket:         'RocketOutline',
  RotateCcw:      'RestartOutline',
  ScanLine:       'ScanBarcodeOutline',
  SearchX:        'MagnifierBugOutline',
  Shield:         'ShieldOutline',
  ShieldCheck:    'ShieldCheckOutline',
  Star:           'StarOutline',
  SwitchCamera:   'CameraRotationOutline',
  Tag:            'TagOutline',
  Ticket:         'TicketOutline',
  ToggleLeft:     'ToggleOffOutline',
  ToggleRight:    'ToggleOnOutline',
  Trash2:         'TrashBinTrashOutline',
  User:           'UserOutline',
  UserCheck:      'UserCheckOutline',
  UserX:          'UserCrossOutline',
  Users:          'UsersGroupRoundedOutline',
  X:              'CloseSquareOutline',
  XCircle:        'CloseCircleOutline',
  Zap:            'BoltOutline',
}

const lucideNames = Object.keys(ICON_MAP)
const files = globSync('apps/member/src/**/*.{tsx,ts}')
let totalFiles = 0

for (const file of files) {
  let content = readFileSync(file, 'utf8')
  const original = content

  // Replace lucide-react import lines
  // Matches: import { Foo, Bar, Baz } from 'lucide-react'
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g,
    (_, imports) => {
      const names = imports.split(',').map(s => s.trim()).filter(Boolean)
      const solarNames = [...new Set(names.map(n => ICON_MAP[n] ?? n))]
      return `import { ${solarNames.join(', ')} } from 'solar-icon-set'`
    }
  )

  // Replace JSX/variable usages of old icon names with new names
  // Process longest names first to avoid partial matches (e.g., CheckCircle2 before CheckCircle)
  const sorted = lucideNames.sort((a, b) => b.length - a.length)
  for (const lucideName of sorted) {
    const solarName = ICON_MAP[lucideName]
    if (lucideName === solarName) continue
    // Replace as JSX tag: <ArrowLeft or </ArrowLeft or <ArrowLeft/
    // Also replace as value: Icon: ArrowLeft, icon={ArrowLeft}, = ArrowLeft,
    const tagRe = new RegExp(`(?<=</?|\\s|[{,=])${lucideName}(?=[\\s/>{},:)\\]])`, 'g')
    content = content.replace(tagRe, solarName)
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8')
    totalFiles++
    console.log(`✏️  ${file}`)
  }
}

console.log(`\n✅ Done. Modified ${totalFiles} files.`)
```

- [ ] **Step 2: Commit the script (before running it)**

```bash
git add scripts/migrate-icons.mjs
git commit -m "chore: add icon migration script"
```

---

## Task 5: Run the migration script

**Files:**
- All files under `apps/member/src/` (modified in bulk by the script)

- [ ] **Step 1: Confirm `glob` is available or install it**

```bash
node -e "import('glob').then(() => console.log('ok')).catch(() => console.log('missing'))"
```

If missing:
```bash
npm install glob --save-dev --legacy-peer-deps
```

- [ ] **Step 2: Run the migration script**

```bash
node scripts/migrate-icons.mjs
```

Expected: list of ~66 modified files, then `✅ Done. Modified 66 files.`

- [ ] **Step 3: Spot-check 3 files to confirm correctness**

```bash
grep "lucide-react\|solar-icon-set" apps/member/src/components/MemberLayout.tsx
grep "lucide-react\|solar-icon-set" apps/member/src/pages/home/Dashboard.tsx
grep "lucide-react\|solar-icon-set" apps/member/src/pages/events/EventsList.tsx
```

Expected: each file shows only `solar-icon-set` imports, zero `lucide-react`.

- [ ] **Step 4: Check for any remaining lucide-react imports**

```bash
grep -r "lucide-react" apps/member/src --include="*.tsx" --include="*.ts"
```

Expected: zero results. If any remain, manually update them using the ICON_MAP table from Task 4 Step 1.

- [ ] **Step 5: Commit the bulk replacement**

```bash
git add apps/member/src/
git commit -m "refactor: replace lucide-react with solar-icon-set across all member app files"
```

---

## Task 6: Remove `lucide-react` and verify

**Files:**
- Modify: `apps/member/package.json`
- Modify: `apps/member/package-lock.json`
- Delete: `scripts/migrate-icons.mjs`

- [ ] **Step 1: Uninstall lucide-react**

```bash
cd apps/member && npm uninstall lucide-react && cd ../..
```

- [ ] **Step 2: Run TypeScript typecheck**

```bash
npm run typecheck
```

Expected: zero errors related to `lucide-react` or missing icon names.

If you see errors like `Module 'solar-icon-set' has no exported member 'FooOutline'`, the Solar export name is wrong. Find the correct name:
```bash
node -e "import('./apps/member/node_modules/solar-icon-set/index.js').then(m => console.log(Object.keys(m).filter(k => k.toLowerCase().includes('foo'))))"
```

Update both the import in the affected file and the `ICON_MAP` in the migration script (for documentation). Repeat typecheck until clean.

- [ ] **Step 3: Delete the migration script**

```bash
rm scripts/migrate-icons.mjs
```

- [ ] **Step 4: Start the dev server and visually smoke test**

```bash
npm run dev:member
```

Open `http://localhost:5173` and check:
- Dashboard — XP card star icon, Quick Actions row icons, nav icons
- Events list — calendar icons, map pin icons
- Organizer layout — scan icon (center hero), nav icons
- Profile — user icon, logout icon
- Any page with loading states — spinner icon

Confirm icons render (not blank squares or broken SVGs).

- [ ] **Step 5: Commit**

```bash
git add apps/member/package.json apps/member/package-lock.json
git commit -m "chore: remove lucide-react, migration to solar-icon-set complete"
```

---

## Task 7: Update CLAUDE.md icon rule

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Update the icon rule in Section 3 and Section 9**

In **Section 3** (Tech Stack table), find:
```
| Icons | `lucide-react` (only — no emoji icons in JSX) |
```
Replace with:
```
| Icons | `solar-icon-set` outline variant (only — no emoji icons in JSX) |
```

In **Section 9** (Icon Rules), find:
```
- Use `lucide-react` exclusively — no emoji icons in JSX
```
Replace with:
```
- Use `solar-icon-set` exclusively (outline variant) — no emoji icons in JSX. Import type `SolarIcon` from `@/lib/icons` for prop typing.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: update CLAUDE.md icon system to solar-icon-set"
```
