import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { motion } from 'framer-motion'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
      style={{ background: 'linear-gradient(160deg, rgb(var(--color-primary-dark)) 0%, rgb(var(--color-primary)) 100%)' }}
    >

      {/* Icon */}
      <motion.div
        className="w-16 h-16 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center mb-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
      >
        <SearchX className="w-8 h-8 text-white" />
      </motion.div>

      {/* 404 */}
      <motion.p
        className="text-8xl font-black text-white leading-none"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.14 }}
      >
        404
      </motion.p>

      {/* Heading + body */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.2 }}
      >
        <h1 className="text-xl font-bold text-white mt-4">Nothing here.</h1>
        <p className="text-sm text-white/60 mt-2 max-w-xs">
          This page doesn't exist or may have been removed.
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex gap-3 mt-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.28 }}
      >
        <motion.button
          onClick={() => navigate('/home')}
          className="bg-white text-primary font-bold text-sm px-6 py-3 rounded-full shadow-md"
          whileTap={{ scale: 0.95 }}
        >
          Go Home
        </motion.button>
        <motion.button
          onClick={() => navigate(-1)}
          className="bg-white/20 border border-white/30 text-white font-semibold text-sm px-6 py-3 rounded-full backdrop-blur-sm"
          whileTap={{ scale: 0.95 }}
        >
          Go Back
        </motion.button>
      </motion.div>
    </div>
  )
}
