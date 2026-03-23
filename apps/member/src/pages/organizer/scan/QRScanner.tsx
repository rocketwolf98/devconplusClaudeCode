import { useEffect, useRef, useState } from 'react'
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

// ── Module-level constants ────────────────────────────────────────────────────

const BACKOFF_MS = [0, 500, 1000, 2000] // index = attempt number (1-based); index 0 unused
const MAX_ATTEMPTS = 3

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

  // ── Camera helpers ────────────────────────────────────────────────────────────

  const stopCamera = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
    if (videoEl?.srcObject) {
      const stream = videoEl.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      videoEl.srcObject = null
    }
  }

  const initCamera = async (el: HTMLVideoElement, deviceId?: string): Promise<void> => {
    const { BrowserQRCodeReader } = await import('@zxing/browser')

    // Race camera init against a 10-second timeout
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Camera start timed out')), 10_000)
    )

    const start = async () => {
      const allDevices = await BrowserQRCodeReader.listVideoInputDevices()
      if (allDevices.length === 0) throw new Error('No camera devices found.')
      setDevices(allDevices)

      const activeId = deviceId ?? selectedDeviceId ?? allDevices[0].deviceId
      if (!selectedDeviceId) setSelectedDeviceId(allDevices[0].deviceId)

      const reader = new BrowserQRCodeReader()
      const controls = await reader.decodeFromVideoDevice(
        activeId || allDevices[0].deviceId,
        el,
        (res, err) => {
          if (res) void handleScannedToken(res.getText())
          else if (err && err.name !== 'NotFoundException') console.error(err)
        }
      )
      controlsRef.current = controls
    }

    await Promise.race([start(), timeout])
  }

  const startCameraWithRetry = async (el: HTMLVideoElement, deviceId?: string) => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      setRetryAttempt(attempt)
      setCameraStatus('starting')

      if (attempt > 1) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]))
      }

      try {
        await initCamera(el, deviceId)
        setCameraStatus('active')
        return // success
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))

        // Permission denied — no retry, immediate terminal state
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
          setCameraStatus('permission_denied')
          return
        }

        // Final attempt failed — show error state
        if (attempt === MAX_ATTEMPTS) {
          setCameraStatus('error')
          return
        }
        // Otherwise loop to next attempt
      }
    }
  }

  // Placeholder — implemented in Task 4
  const handleScannedToken = async (_token: string) => {}

  // Start camera when video element mounts (callback ref fires after DOM commit)
  useEffect(() => {
    if (!videoEl) return
    void startCameraWithRetry(videoEl)
    return () => {
      stopCamera()
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
    }
  }, [videoEl]) // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black">
      <video
        ref={videoCallbackRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />
      {/* Status debug badge — removed in Task 6 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
        {cameraStatus} {cameraStatus === 'starting' ? `(attempt ${retryAttempt}/3)` : ''}
      </div>
    </div>,
    document.body
  )
}
