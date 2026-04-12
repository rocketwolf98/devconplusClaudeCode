# Solar Icon Migration Design
**Date:** 2026-04-12
**Scope:** Replace `lucide-react` with `solar-icon-set` (outline variant) across `apps/member/`

---

## Overview

Replace all `lucide-react` icon imports in the member app (66 files, ~75 unique icons) with the Solar icon pack's outline variant via the `solar-icon-set` npm package. Introduce a shared `SolarIcon` type alias in `lib/icons.ts` to replace all `LucideIcon` prop typings.

---

## Package Setup

- **Install:** `solar-icon-set` in `apps/member/`
- **Remove:** `lucide-react` from `apps/member/package.json` after migration

```bash
cd apps/member && npm install solar-icon-set --legacy-peer-deps
```

---

## Type System

Create `apps/member/src/lib/icons.ts`:

```ts
import type { ComponentType, SVGProps } from 'react'

export type SolarIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
```

All components that currently import `LucideIcon` switch to:
```ts
import type { SolarIcon } from '@/lib/icons'
```

---

## Icon Mapping Table (Lucide → Solar Outline)

| Lucide | Solar (`solar-icon-set`) |
|---|---|
| `AlertCircle` | `AlertCircleOutline` |
| `AlertTriangle` | `DangerTriangleOutline` |
| `Archive` | `ArchiveOutline` |
| `ArrowLeft` | `ArrowLeftOutline` |
| `AtSign` | `AtSignOutline` |
| `Award` | `TrophyOutline` |
| `Bell` | `BellOutline` |
| `BellOff` | `BellOffOutline` |
| `Briefcase` | `BriefcaseOutline` |
| `Building2` | `BuildingsOutline` |
| `Calendar` | `CalendarOutline` |
| `CalendarDays` | `CalendarOutline` |
| `CalendarOff` | `CalendarRemoveOutline` |
| `CalendarPlus` | `CalendarAddOutline` |
| `CalendarX` | `CalendarRemoveOutline` |
| `Camera` | `CameraOutline` |
| `Check` | `CheckOutline` |
| `CheckCircle` | `CheckCircleOutline` |
| `CheckCircle2` | `CheckCircleOutline` |
| `ChevronDown` | `AltArrowDownOutline` |
| `ChevronRight` | `AltArrowRightOutline` |
| `ChevronUp` | `AltArrowUpOutline` |
| `ClipboardList` | `ClipboardListOutline` |
| `Clock` | `ClockCircleOutline` |
| `Copy` | `CopyOutline` |
| `Download` | `DownloadOutline` |
| `ExternalLink` | `ShareOutline` |
| `Eye` | `EyeOutline` |
| `EyeOff` | `EyeClosedOutline` |
| `Flame` | `FireOutline` |
| `Gift` | `GiftOutline` |
| `Heart` | `HeartOutline` |
| `Home` | `HomeOutline` |
| `ImagePlus` | `GalleryAddOutline` |
| `Info` | `InfoCircleOutline` |
| `KeyRound` | `KeyOutline` |
| `LayoutDashboard` | `WidgetsOutline` |
| `Link2` | `LinkOutline` |
| `Loader2` | `SpinnerOutline` |
| `LogOut` | `LogoutOutline` |
| `Mail` | `LetterOutline` |
| `MapPin` | `MapPointOutline` |
| `Megaphone` | `MegaphoneOutline` |
| `Monitor` | `MonitorOutline` |
| `Newspaper` | `NewspaperOutline` |
| `Package` | `BoxOutline` |
| `Pencil` | `PenOutline` |
| `Phone` | `PhoneOutline` |
| `Plus` | `AddOutline` |
| `QrCode` | `QrCodeOutline` |
| `RefreshCw` | `RefreshOutline` |
| `Rocket` | `RocketOutline` |
| `RotateCcw` | `RestartOutline` |
| `ScanLine` | `ScanBarcodeOutline` |
| `SearchX` | `MagnifierBugOutline` |
| `Shield` | `ShieldOutline` |
| `ShieldCheck` | `ShieldCheckOutline` |
| `Star` | `StarOutline` |
| `SwitchCamera` | `CameraRotationOutline` |
| `Tag` | `TagOutline` |
| `Ticket` | `TicketOutline` |
| `ToggleLeft` | `ToggleOffOutline` |
| `ToggleRight` | `ToggleOnOutline` |
| `Trash2` | `TrashBinTrashOutline` |
| `User` | `UserOutline` |
| `UserCheck` | `UserCheckOutline` |
| `UserX` | `UserCrossOutline` |
| `Users` | `UsersGroupRoundedOutline` |
| `X` | `CloseSquareOutline` |
| `XCircle` | `CloseCircleOutline` |
| `Zap` | `BoltOutline` |

---

## Migration Execution (5 steps, in order)

### Step 1 — Verify Solar export names
Before any file edits, import the `solar-icon-set` package and verify every name in the mapping table exists as a named export. Fix any discrepancies in the table first.

### Step 2 — Install package & create `lib/icons.ts`
- `npm install solar-icon-set --legacy-peer-deps` in `apps/member/`
- Write `apps/member/src/lib/icons.ts` with the `SolarIcon` type

### Step 3 — Replace `LucideIcon` type references
- Grep for `LucideIcon` across all `.tsx`/`.ts` files
- Swap import source to `../lib/icons` (or `@/lib/icons`) and type name to `SolarIcon`
- Expected: ~5–10 files affected

### Step 4 — Bulk icon import + usage replacement
For each mapping entry, run targeted replacements across all files:
- Replace `import { LucideName } from 'lucide-react'` → `import { SolarName } from 'solar-icon-set'`
- Multi-icon imports on one line: split into individual import statements
- Audit any explicit `size={N}` props on lucide icons — Solar SVG components use `width`/`height`, not `size`. Convert where needed.

### Step 5 — Remove lucide-react & verify
- Uninstall `lucide-react` from `apps/member/`
- Run `npm run typecheck` — fix any remaining references
- Run `npm run dev:member` — visual smoke test

---

## Files That Own `LucideIcon` Type (to audit in Step 3)

Identified via `grep -r "LucideIcon"`:
- Nav item configs in `MemberLayout.tsx`, `OrganizerLayout.tsx`, `AdminLayout.tsx`
- Any component that accepts an icon as a prop (e.g., quick action cards, menu items)

---

## Out of Scope

- Organizer app (`apps/organizer/` if separate) — only `apps/member/` is targeted
- Icon size/color system redesign — Tailwind `className` sizing remains unchanged
- Adding new icons beyond the current set
