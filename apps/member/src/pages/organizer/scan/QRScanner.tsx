import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, XCircle, Zap, Info, SwitchCamera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { fadeUp } from '../../../lib/animation'

interface ScanResult {
  memberName: string
  pointsAwarded: number
  eventTitle: string
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error'

export function OrgQRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceIndex, setDeviceIndex] = useState(0)
  const [isSwitching, setIsSwitching] = useState(false)

  const stopScanning = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }

  const startCamera = async (index?: number) => {
    setScanState('scanning')
    setResult(null)
    setErrorMsg('')

    try {
      const reader = new BrowserQRCodeReader()
      const allDevices = await BrowserQRCodeReader.listVideoInputDevices()
      if (allDevices.length === 0) throw new Error('No camera devices found.')

      // Persist device list on first load
      if (devices.length === 0) setDevices(allDevices)

      const activeIndex = index ?? deviceIndex
      const deviceId = allDevices[activeIndex]?.deviceId ?? allDevices[allDevices.length - 1].deviceId

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (res, err) => {
          if (res) {
            stopScanning()
            handleScannedToken(res.getText())
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

  const switchCamera = async () => {
    if (devices.length < 2 || isSwitching) return
    setIsSwitching(true)
    stopScanning()
    const nextIndex = (deviceIndex + 1) % devices.length
    setDeviceIndex(nextIndex)
    await startCamera(nextIndex)
    setIsSwitching(false)
  }

  const handleScannedToken = (token: string) => {
    if (token.startsWith('DCN-') || token.length > 4) {
      setResult({
        memberName: 'Marie Santos',
        pointsAwarded: 200,
        eventTitle: 'DEVCON Summit Manila 2026',
      })
      setScanState('success')
    } else {
      setScanState('error')
      setErrorMsg('Invalid QR code. Please try again.')
    }
  }

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (manualToken.trim()) {
      handleScannedToken(manualToken.trim())
      setManualToken('')
    }
  }

  const reset = () => {
    stopScanning()
    setScanState('idle')
    setResult(null)
    setErrorMsg('')
  }

  useEffect(() => {
    return () => { stopScanning() }
  }, [])

  return (
    <div>
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
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
                className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => startCamera()}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-primary" />
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
                    placeholder="Paste QR token (e.g. DCN-ABC123)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors"
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
              {/* Viewfinder */}
              <div className="bg-black rounded-2xl overflow-hidden aspect-square relative">
                <video ref={videoRef} className="w-full h-full object-cover" />

                {/* Targeting frame */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/80 rounded-2xl" />
                </div>

                {/* Swap camera button — only shown when multiple cameras available */}
                {devices.length > 1 && (
                  <button
                    onClick={switchCamera}
                    disabled={isSwitching}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center border border-white/20 transition-opacity disabled:opacity-40"
                    aria-label="Switch camera"
                  >
                    <SwitchCamera className={`w-5 h-5 text-white ${isSwitching ? 'animate-spin' : ''}`} />
                  </button>
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
                className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors"
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
                className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="mt-6 bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            This scanner uses your device camera via getUserMedia. For best results, use Chrome on
            desktop or Android. iOS Safari has limited camera API support.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
