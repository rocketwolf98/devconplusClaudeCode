import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, XCircle, Zap, Info, SwitchCamera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { fadeUp } from '../../../lib/animation'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/useAuthStore'

interface ScanResult {
  memberName: string
  pointsAwarded: number
  eventTitle: string
}

interface AlreadyCheckedInResult {
  memberName: string
}

type ScanState = 'idle' | 'scanning' | 'success' | 'already_checked_in' | 'error'

export function OrgQRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState<AlreadyCheckedInResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isSwitching, setIsSwitching] = useState(false)
  const { user } = useAuthStore()

  // Pre-enumerate cameras on mount so the dropdown is ready before scanning starts.
  // This may silently fail if permissions aren't granted yet — that's fine, we
  // enumerate again inside startCamera once the user triggers camera access.
  useEffect(() => {
    BrowserQRCodeReader.listVideoInputDevices()
      .then((list) => {
        setDevices(list)
        if (list.length > 0 && !selectedDeviceId) setSelectedDeviceId(list[0].deviceId)
      })
      .catch(() => undefined)

    return () => { stopScanning() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopScanning = () => {
    controlsRef.current?.stop()
    controlsRef.current = null

    // Explicitly release the MediaStream so the camera hardware is fully freed.
    // zxing's stop() is inconsistent across browsers about releasing tracks.
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
  }

  const startCamera = async (deviceId?: string) => {
    setScanState('scanning')
    setResult(null)
    setErrorMsg('')

    try {
      const reader = new BrowserQRCodeReader()
      const allDevices = await BrowserQRCodeReader.listVideoInputDevices()
      if (allDevices.length === 0) throw new Error('No camera devices found.')

      // Update device list now that we have camera permission
      setDevices(allDevices)

      const activeId = deviceId ?? selectedDeviceId ?? allDevices[0].deviceId
      if (!selectedDeviceId) setSelectedDeviceId(allDevices[0].deviceId)

      const controls = await reader.decodeFromVideoDevice(
        activeId || allDevices[0].deviceId,
        videoRef.current!,
        (res, err) => {
          if (res) {
            stopScanning()
            void handleScannedToken(res.getText())
          } else if (err && err.name !== 'NotFoundException') {
            console.error(err)
          }
        }
      )
      controlsRef.current = controls
    } catch (e) {
      setScanState('error')
      setErrorMsg(e instanceof Error ? e.message : 'Camera access failed.')
    }
  }

  const switchCamera = async (newDeviceId: string) => {
    if (isSwitching || newDeviceId === selectedDeviceId) return
    setIsSwitching(true)
    setSelectedDeviceId(newDeviceId)
    stopScanning()
    await startCamera(newDeviceId)
    setIsSwitching(false)
  }

  const handleScannedToken = async (token: string) => {
    if (!user) {
      setScanState('error')
      setErrorMsg('Session expired. Please sign in again.')
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean
        member_name?: string
        points_awarded?: number
        event_title?: string
        already_checked_in?: boolean
        error?: string
      }>('award-points-on-scan', {
        body: { token },
      })

      if (error) {
        setScanState('error')
        setErrorMsg(error.message ?? 'Scan failed. Please try again.')
        return
      }

      if (data?.already_checked_in) {
        setAlreadyCheckedIn({ memberName: data.member_name ?? 'Member' })
        setScanState('already_checked_in')
        return
      }

      if (data?.error === 'token_expired') {
        setScanState('error')
        setErrorMsg('QR expired — ask member to refresh their screen.')
        return
      }

      if (data?.error === 'invalid_token') {
        setScanState('error')
        setErrorMsg('Invalid QR code.')
        return
      }

      if (!data?.success) {
        setScanState('error')
        setErrorMsg(data?.error ?? 'Scan failed. Please try again.')
        return
      }

      setResult({
        memberName:    data.member_name ?? 'Member',
        pointsAwarded: data.points_awarded ?? 0,
        eventTitle:    data.event_title ?? '',
      })
      setScanState('success')
    } catch (e) {
      // supabase.functions.invoke can throw on network errors (e.g. no URL configured).
      // Catch here so the promise rejection is never silently swallowed.
      setScanState('error')
      setErrorMsg(e instanceof Error ? e.message : 'Scan failed. Please try again.')
    }
  }

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (manualToken.trim()) {
      void handleScannedToken(manualToken.trim())
      setManualToken('')
    }
  }

  const reset = () => {
    stopScanning()
    setScanState('idle')
    setResult(null)
    setAlreadyCheckedIn(null)
    setErrorMsg('')
  }

  return (
    <div>
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <h1 className="text-2xl font-black text-white mb-1">QR Scanner</h1>
        <p className="text-white/60 text-sm">
          Scan member QR tickets at the door to award attendance XP.
        </p>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {scanState === 'idle' && (
            <motion.div
              key="idle"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              <motion.div
                className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center cursor-pointer hover:border-blue transition-colors"
                onClick={() => void startCamera()}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-blue/10 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-blue" />
                </div>
                <p className="text-base font-bold text-slate-700 mb-1">Start Camera Scanner</p>
                <p className="text-sm text-slate-400">
                  Opens your device camera to scan QR codes.
                  <br />
                  Best used on Chrome (desktop or Android).
                </p>
              </motion.div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">Or enter token manually</p>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste JWT token from member's screen"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
                  >
                    Scan
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {scanState === 'scanning' && (
            <motion.div
              key="scanning"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              {/* Camera selector dropdown — shown whenever multiple cameras are detected */}
              {devices.length > 1 && (
                <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2">
                  <SwitchCamera className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => void switchCamera(e.target.value)}
                    disabled={isSwitching}
                    className="flex-1 text-sm text-slate-700 bg-transparent focus:outline-none disabled:opacity-50 cursor-pointer"
                  >
                    {devices.map((device, i) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-black rounded-2xl overflow-hidden aspect-square relative">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/80 rounded-2xl" />
                </div>
                {isSwitching && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                    <p className="text-white text-sm font-semibold">Switching camera…</p>
                  </div>
                )}
              </div>

              <button
                onClick={reset}
                className="w-full py-3 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {scanState === 'success' && result && (
            <motion.div
              key="success"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              <div className="bg-green/10 border border-green/30 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green" />
                </div>
                <p className="text-xl font-black text-slate-900 mb-1">{result.memberName}</p>
                <p className="text-sm text-slate-500 mb-4">{result.eventTitle}</p>
                <div className="inline-flex items-center gap-2 bg-green/10 rounded-full px-5 py-2 border border-green/30">
                  <Zap className="w-4 h-4 text-green" />
                  <span className="text-lg font-black text-green">+{result.pointsAwarded} XP awarded!</span>
                </div>
              </div>
              <motion.button
                onClick={reset}
                className="w-full py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Scan Next Member
              </motion.button>
            </motion.div>
          )}

          {scanState === 'already_checked_in' && alreadyCheckedIn && (
            <motion.div
              key="already_checked_in"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-xl font-black text-slate-900 mb-1">{alreadyCheckedIn.memberName}</p>
                <p className="text-sm text-amber-600 font-medium">Already checked in</p>
              </div>
              <motion.button
                onClick={reset}
                className="w-full py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Scan Next Member
              </motion.button>
            </motion.div>
          )}

          {scanState === 'error' && (
            <motion.div
              key="error"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              <div className="bg-red/10 border border-red/20 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red" />
                </div>
                <p className="text-base font-bold text-slate-900 mb-1">Scan Failed</p>
                <p className="text-sm text-slate-500">{errorMsg}</p>
              </div>
              <motion.button
                onClick={reset}
                className="w-full py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="mt-6 bg-blue/5 border border-blue/10 rounded-xl p-4 flex gap-3"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Info className="w-4 h-4 text-blue shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            This scanner uses your device camera via getUserMedia. For best results, use Chrome on
            desktop or Android. iOS Safari has limited camera API support.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
