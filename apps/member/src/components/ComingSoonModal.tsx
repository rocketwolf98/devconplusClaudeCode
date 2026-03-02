import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Rocket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { backdrop, slideUp } from '../lib/animation'

interface Props {
  onClose: () => void
  feature?: string
}

export default function ComingSoonModal({ onClose, feature = 'This feature' }: Props) {
  const [visible, setVisible] = useState(true)

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-2xl p-6 pb-32"
            variants={slideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-6" />
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Rocket className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Coming Soon</h2>
              <p className="text-sm text-slate-500 mb-6">{feature} is launching soon. Stay tuned!</p>
              <button
                onClick={handleClose}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
