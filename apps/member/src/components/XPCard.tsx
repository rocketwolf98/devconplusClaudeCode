import { useNavigate } from 'react-router-dom'
import { Star, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePointsStore } from '../stores/usePointsStore'

export default function XPCard() {
  const navigate = useNavigate()
  const { spendablePoints, lifetimePoints, currentTier, nextTier, tierProgress } = usePointsStore()

  return (
    <div className="bg-white rounded-3xl shadow-xl p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs font-medium">Current DEVCON Points</p>
      </div>

      {/* Main points number */}
      <div className="flex items-end gap-2 mb-1">
        <Star className="w-8 h-8 text-gold fill-gold shrink-0 mb-0.5" />
        <span className="text-4xl font-black text-slate-900 leading-none">
          {spendablePoints.toLocaleString()}
        </span>
        <span className="text-slate-400 font-semibold text-base mb-0.5">pts</span>
      </div>

      {/* Lifetime points */}
      <div className="flex items-center gap-1 mb-4">
        <Zap className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="text-xs text-slate-400">
          {lifetimePoints.toLocaleString()} lifetime pts
        </span>
      </div>

      {/* Tier badge row */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: currentTier.color + '20', color: currentTier.color }}
        >
          {currentTier.icon} {currentTier.name}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: nextTier ? '#F8C630' : currentTier.color }}
          initial={{ width: 0 }}
          animate={{ width: `${tierProgress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>


      <motion.button
        onClick={() => navigate('/events')}
        className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl text-sm"
        whileTap={{ scale: 0.95 }}
      >
        Attend Our Events
      </motion.button>
    </div>
  )
}
