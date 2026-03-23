# QR Scanner Full-Screen Redesign
**Date:** 2026-03-23
**Status:** Approved

## Overview
Full rewrite of `apps/member/src/pages/organizer/scan/QRScanner.tsx`.
Always-on full-screen camera. Camera starts on mount. Results show as a transient overlay.
Camera never pauses between scans. Manual JWT form fully removed.

## Full-Screen Escape (Blocker A resolved)
OrganizerLayout's scroll container (`overflow-y-auto`) clips `position: fixed` children.
Solution: the scanner page renders its entire UI via `ReactDOM.createPortal(…, document.body)`.
The portal uses Tailwind `z-[100]` (arbitrary value — not a default token).
OrganizerLayout's bottom nav is `z-50` (Tailwind default = 50) so the portal sits above it.
The result overlay within the portal uses `z-[110]`.

## State Model (Blocker B resolved — two orthogonal states)
Camera status and result display are independent. A result overlay appears OVER an active
camera, never instead of it.

```ts
// Camera lifecycle — independent of result display
type CameraStatus = 'starting' | 'active' | 'permission_denied' | 'error'

// Result overlay — null when nothing to show, non-null while visible
interface ResultOverlay {
  type: 'success' | 'already_checked_in' | 'error'
  memberName?: string
  eventTitle?: string   // from Edge Function response
  pointsAwarded?: number
  message?: string
}

// Component state:
// cameraStatus: CameraStatus
// overlay: ResultOverlay | null
// retryAttempt: number (1–3, shown in spinner during 'starting')
// devices: MediaDeviceInfo[]
// selectedDeviceId: string
// isSwitching: boolean
```

## Manual Fallback (Blocker C resolved)
The manual JWT input form, `manualToken` state, and `handleManualSubmit` handler are
**completely removed**. There is no fallback path. Officers use a supported browser.

## Overlay Behaviour (Blocker D resolved)
- On auto-dismiss: 3s CSS progress bar (width 100%→0%, `transition: width 3s linear`),
  driven by a `setTimeout`. On timeout: `overlay = null`, `isProcessingRef.current = false`.
- On early tap: cancel the setTimeout, `overlay = null`, `isProcessingRef.current = false`.
- If a second QR scan triggers while overlay is visible: **replace immediately** — cancel
  the existing timeout, set the new overlay, start a fresh 3s timer. No queuing.
- Progress bar is inside the overlay sheet (bottom of the card, full width, rounded).
- Tap target for early dismiss is the entire overlay sheet.
- Cleanup on component unmount: cancel timeout, release camera stream.

## Edge Function (Blocker E resolved)
The `supabase.functions.invoke('award-points-on-scan', …)` call is kept as-is.
This matches the existing pattern in the stores (which already use real supabase calls).
No mock path needed — aligns with current codebase state.

## Scan Lock
`isProcessingRef = useRef(false)`.
On QR decode callback: if `true` → skip. Set `true` before Edge Function call.
Reset to `false` when overlay dismisses (auto or manual).

## Timeout & Retry
Each attempt races its own 10-second timeout. Three attempts maximum.
Backoff between attempts: 500ms → 1000ms → 2000ms.
`retryAttempt` state drives the spinner label: "Starting camera… (attempt N/3)".
After 3 failures: `cameraStatus = 'error'`, message = "Camera unavailable — check browser permissions."
`permission_denied` is detected separately via `error.name === 'NotAllowedError'`; no retry
is attempted. Message: "Camera access denied — enable it in your browser settings."

## Lens Swap
`SwitchCamera` icon button, top-right, `z-[110]`, shown only when `devices.length >= 2`.
Single tap cycles: `nextIndex = (currentIndex + 1) % devices.length`.
Works for 2, 3, or 4+ cameras. Shows "Switching…" label during transition.

## Layout (portal root)
```
position: fixed, inset: 0, z-[100], bg-black
├── <video> — w-full h-full object-cover
├── vignette — absolute inset-0 bg-black/40 pointer-events-none
├── top bar (absolute top-0, safe-top padding)
│   ├── left: ArrowLeft button (navigates back via React Router)
│   └── right: SwitchCamera button (if devices.length >= 2)
├── finder box (absolute centered)
│   ├── 240×240 transparent area
│   ├── corner bracket SVGs (white, 20px L-shapes, rounded)
│   └── "Align QR to scan" label below
├── iOS info chip (absolute bottom-safe, amber, small)
│   "For best results, use Chrome on Android"
└── ResultOverlay (AnimatePresence, slides from y: 60 → y: 0)
    ├── success   → green sheet
    ├── already_checked_in → amber sheet
    └── error     → red sheet
    Each: member name, context line, progress bar
```

## Starting / Error States (rendered inside the portal, camera bg still shown)
- `starting`: centred white spinner + "Starting camera… (attempt N/3)"
- `permission_denied`: centred white card "Camera access denied — enable it in your browser settings." No retry button.
- `error` after 3 failures: centred white card + "Try Again" button that resets attempt counter and calls initCamera.

## Components Modified
- `apps/member/src/pages/organizer/scan/QRScanner.tsx` — full rewrite
