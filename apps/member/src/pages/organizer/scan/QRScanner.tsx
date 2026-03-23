import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, SwitchCamera, CheckCircle2, Info, XCircle, Zap } from 'lucide-react'

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

// ── Module-level helper component ─────────────────────────────────────────────
const CornerBrackets = () => (
  <svg
    viewBox="0 0 240 240"
    className="absolute inset-0 w-full h-full"
    fill="none"
    stroke="white"
    strokeWidth="3"
    strokeLinecap="round"
  >
    {/* Top-left */}
    <path d="M 0 30 L 0 0 L 30 0" />
    {/* Top-right */}
    <path d="M 210 0 L 240 0 L 240 30" />
    {/* Bottom-left */}
    <path d="M 0 210 L 0 240 L 30 240" />
    {/* Bottom-right */}
    <path d="M 240 210 L 240 240 L 210 240" />
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

export function OrgQRScanner() {
  const navigate = useNavigate()

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
  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => setVideoEl(el), [])
  const overlayKeyRef = useRef(0)   // monotonic counter — guarantees unique key per overlay
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
    overlayKeyRef.current += 1   // new key forces AnimatePresence to remount the node
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

  // ── Camera switching helpers ──────────────────────────────────────────────────

  const switchCamera = async (nextDeviceId: string) => {
    if (isSwitching || nextDeviceId === selectedDeviceId || !videoEl) return
    setIsSwitching(true)
    setSelectedDeviceId(nextDeviceId)
    stopCamera()
    await startCameraWithRetry(videoEl, nextDeviceId)
    setIsSwitching(false)
  }

  const cycleCamera = () => {
    if (devices.length < 2) return
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId)
    const nextIndex = (currentIndex + 1) % devices.length
    void switchCamera(devices[nextIndex].deviceId)
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
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">

      {/* Live camera feed */}
      <video
        ref={videoCallbackRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* ── Starting / error states ─────────────────────────────────────────── */}
      <AnimatePresence>
        {cameraStatus === 'starting' && (
          <motion.div
            key="starting"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
          >
            <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <p className="text-white text-sm font-medium">
              Starting camera…{retryAttempt > 1 ? ` (attempt ${retryAttempt}/3)` : ''}
            </p>
          </motion.div>
        )}

        {cameraStatus === 'permission_denied' && (
          <motion.div
            key="permission_denied"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center px-8"
          >
            <div className="bg-white rounded-2xl p-6 text-center w-full max-w-xs">
              <div className="w-12 h-12 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-6 h-6 text-red" />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">Camera access denied</p>
              <p className="text-xs text-slate-500">Enable camera access in your browser settings and reload the page.</p>
            </div>
          </motion.div>
        )}

        {cameraStatus === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center px-8"
          >
            <div className="bg-white rounded-2xl p-6 text-center w-full max-w-xs">
              <div className="w-12 h-12 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-6 h-6 text-red" />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">Camera unavailable</p>
              <p className="text-xs text-slate-500 mb-4">Check browser permissions and try again.</p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => { if (videoEl) void startCameraWithRetry(videoEl) }}
                className="w-full py-2.5 bg-blue text-white text-sm font-bold rounded-xl"
              >
                Try Again
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active scanning UI ───────────────────────────────────────────────── */}
      {cameraStatus === 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="relative w-60 h-60">
            <CornerBrackets />
          </div>
          <p className="text-white/80 text-sm font-medium tracking-wide">
            {isSwitching ? 'Switching camera…' : 'Align QR to scan'}
          </p>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-[110] flex items-center justify-between px-4 pt-14 pb-4">
        <motion.button
          type="button"
          aria-label="Go back"
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>

        {devices.length >= 2 && (
          <motion.button
            type="button"
            aria-label="Switch camera lens"
            whileTap={{ scale: 0.9 }}
            onClick={cycleCamera}
            disabled={isSwitching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/40 backdrop-blur disabled:opacity-40"
          >
            <SwitchCamera className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-medium">Lens</span>
          </motion.button>
        )}
      </div>

      {/* ── iOS info chip ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 backdrop-blur rounded-full px-3 py-1.5 pointer-events-none">
        <Info className="w-3 h-3 text-amber-300 shrink-0" />
        <p className="text-amber-200 text-[10px] font-medium whitespace-nowrap">
          For best results, use Chrome on Android
        </p>
      </div>

      {/* ── Result overlay (slides up, camera stays live behind) ─────────────── */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            key={overlayKeyRef.current}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={dismissOverlay}
            className="absolute bottom-0 left-0 right-0 z-[110] px-4 pb-10 cursor-pointer"
          >
            {overlay.type === 'success' && (
              <div className="bg-green rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-black text-base truncate">{overlay.memberName}</p>
                    <p className="text-white/70 text-xs truncate">{overlay.eventTitle}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                    <span className="text-white font-black text-lg">+{overlay.pointsAwarded}</span>
                  </div>
                </div>
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: '100%', transition: `width ${OVERLAY_DURATION_MS}ms linear` }}
                    ref={(el) => { if (el) requestAnimationFrame(() => { el.style.width = '0%' }) }}
                  />
                </div>
              </div>
            )}

            {overlay.type === 'already_checked_in' && (
              <div className="bg-amber-500 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-black text-base">{overlay.memberName}</p>
                    <p className="text-white/80 text-xs">Already checked in</p>
                  </div>
                </div>
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: '100%', transition: `width ${OVERLAY_DURATION_MS}ms linear` }}
                    ref={(el) => { if (el) requestAnimationFrame(() => { el.style.width = '0%' }) }}
                  />
                </div>
              </div>
            )}

            {overlay.type === 'error' && (
              <div className="bg-red rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-black text-base">Scan Failed</p>
                    <p className="text-white/80 text-xs">{overlay.message}</p>
                  </div>
                </div>
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: '100%', transition: `width ${OVERLAY_DURATION_MS}ms linear` }}
                    ref={(el) => { if (el) requestAnimationFrame(() => { el.style.width = '0%' }) }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>,
    document.body
  )
}
