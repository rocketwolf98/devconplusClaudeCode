import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ShieldCheck, Monitor, Gamepad2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { backdrop, fadeUp } from '../lib/animation'
import { useAuthStore } from '../stores/useAuthStore'

interface Props {
  open: boolean
  onClose: () => void
}

const ADMIN_ROLES = ['super_admin', 'hq_admin'] as const

export default function KonamiModal({ open, onClose }: Props) {
  const { user } = useAuthStore()
  // Capture desktop state once when modal opens — avoids snapshot drift on resize
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (open) {
      setIsDesktop(window.matchMedia('(min-width: 1024px)').matches)
    }
  }, [open])

  const isAdmin = user !== null && (user.role === 'super_admin' || user.role === 'hq_admin')

  const handleEnterAdmin = () => {
    window.location.href = '/admin'
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            className="fixed inset-0 z-[10000] flex items-center justify-center px-6"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                {/* State 1: Admin on desktop */}
                {isAdmin && isDesktop && (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue/10 flex items-center justify-center">
                        <ShieldCheck className="w-7 h-7 text-blue" />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Admin Access</h2>
                    <p className="text-sm text-slate-500 mb-6">You found the secret entrance.</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEnterAdmin}
                      className="w-full bg-blue text-white font-bold py-3.5 rounded-2xl hover:bg-blue-dark transition-colors"
                    >
                      Enter Super Admin Mode
                    </motion.button>
                  </>
                )}

                {/* State 2: Admin on mobile */}
                {isAdmin && !isDesktop && (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Monitor className="w-7 h-7 text-slate-400" />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Desktop Required</h2>
                    <p className="text-sm text-slate-500 mb-6">The admin panel requires a desktop browser.</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                      Got it
                    </motion.button>
                  </>
                )}

                {/* State 3: Non-admin easter egg — icon only, no emoji alongside the logo image */}
                {!isAdmin && (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Gamepad2 className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Thanks for using DEVCON+!</h2>
                    <p className="text-sm text-slate-500 mb-6">Go, go, go!!! Todo na to!!!</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-opacity"
                    >
                      Let's go!
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
