import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ── Types ────────────────────────────────────────────────────────────────────

type CameraStatus = 'starting' | 'active' | 'permission_denied' | 'error'

interface ResultOverlay {
  type: 'success' | 'already_checked_in' | 'error'
  memberName?: string
  eventTitle?: string
  pointsAwarded?: number
  message?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrgQRScanner() {
  // Camera lifecycle — independent of result display
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('starting')
  const [retryAttempt, setRetryAttempt] = useState(1)   // 1–3, shown in spinner
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isSwitching, setIsSwitching] = useState(false)

  // Result overlay — null = nothing showing, non-null = slide-up sheet visible
  const [overlay, setOverlay] = useState<ResultOverlay | null>(null)

  // Refs
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const videoCallbackRef = (el: HTMLVideoElement | null) => setVideoEl(el)
  const controlsRef = useRef<import('@zxing/browser').IScannerControls | null>(null)
  const isProcessingRef = useRef(false)         // scan lock — prevents duplicate API calls
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <p className="text-white text-sm font-mono">
        status: {cameraStatus} | overlay: {overlay?.type ?? 'null'}
      </p>
    </div>,
    document.body
  )
}
