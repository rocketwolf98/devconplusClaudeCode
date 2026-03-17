import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { motion } from 'framer-motion'
import logoMark from '../assets/logos/logo-mark.svg'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="py-24 px-8 flex flex-col items-center justify-center text-center bg-slate-50 min-h-screen">
      <img src={logoMark} alt="DEVCON+" className="h-8 w-auto mb-8 opacity-30" />

      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <SearchX className="w-8 h-8 text-primary" />
      </div>

      <p className="text-8xl font-black text-primary leading-none">404</p>
      <h1 className="text-xl font-bold text-slate-900 mt-4">Nothing here.</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-xs">
        This page doesn't exist or may have been removed.
      </p>

      <div className="flex gap-3 mt-8">
        <motion.button
          onClick={() => navigate('/home')}
          className="bg-primary text-white font-semibold text-sm px-6 py-3 rounded-full"
          whileTap={{ scale: 0.95 }}
        >
          Go Home
        </motion.button>
        <motion.button
          onClick={() => navigate(-1)}
          className="border border-slate-200 text-slate-700 font-semibold text-sm px-6 py-3 rounded-full"
          whileTap={{ scale: 0.95 }}
        >
          Go Back
        </motion.button>
      </div>
    </div>
  )
}
