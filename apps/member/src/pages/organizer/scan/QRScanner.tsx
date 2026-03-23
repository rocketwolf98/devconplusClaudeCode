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
const OVERLAY_DURATION_MS = 3000

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

  const dismissOverlay = () => {
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current)
      overlayTimerRef.current = null
    }
    setOverlay(null)
    isProcessingRef.current = false
  }

  const showOverlay = (next: ResultOverlay) => {
    // Replace any existing overlay immediately (cancel its timer first)
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
    setOverlay(next)
    overlayTimerRef.current = setTimeout(dismissOverlay, OVERLAY_DURATION_MS)
  }

  const handleScannedToken = async (token: string) => {
    // Scan lock — zxing fires this callback many times/second for the same code
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    try {
      const { supabase } = await import('../../../lib/supabase')
      const { useAuthStore } = await import('../../../stores/useAuthStore')
      const user = useAuthStore.getState().user

      if (!user) {
        showOverlay({ type: 'error', message: 'Session expired. Please sign in again.' })
        return
      }

      // NOTE: existing codebase uses `{ token }` — preserve this field name to match
      // the deployed Edge Function.
      const { data, error } = await supabase.functions.invoke<{
        success: boolean
        member_name?: string
        points_awarded?: number
        event_title?: string
        already_checked_in?: boolean
        error?: string
      }>('award-points-on-scan', { body: { token } })

      if (error) {
        showOverlay({ type: 'error', message: error.message ?? 'Scan failed. Try again.' })
        return
      }

      if (data?.already_checked_in) {
        showOverlay({ type: 'already_checked_in', memberName: data.member_name ?? 'Member' })
        return
      }

      if (data?.error === 'token_expired') {
        showOverlay({ type: 'error', message: 'QR expired — ask member to refresh.' })
        return
      }

      if (data?.error === 'invalid_token') {
        showOverlay({ type: 'error', message: 'Invalid QR code.' })
        return
      }

      if (!data?.success) {
        showOverlay({ type: 'error', message: data?.error ?? 'Scan failed. Try again.' })
        return
      }

      showOverlay({
        type: 'success',
        memberName: data.member_name ?? 'Member',
        eventTitle: data.event_title ?? '',
        pointsAwarded: data.points_awarded ?? 0,
      })
    } catch (e) {
      showOverlay({
        type: 'error',
        message: e instanceof Error ? e.message : 'Scan failed. Try again.',
      })
    }
  }

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
