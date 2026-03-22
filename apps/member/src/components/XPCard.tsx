import { useNavigate } from 'react-router-dom'
import { Star, Award, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePointsStore } from '../stores/usePointsStore'

const PRESTIGE_THRESHOLD = 3000

export default function XPCard() {
  const navigate = useNavigate()
  const { spendablePoints, lifetimePoints, prestigeUnlocked } = usePointsStore()

  const progressPct = Math.min((lifetimePoints / PRESTIGE_THRESHOLD) * 100, 100)

  return (
    <div className="bg-white rounded-3xl shadow-xl p-5">
      {/* Header row: label + optional Prestige badge */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs font-medium">Current DEVCON Points</p>
        {prestigeUnlocked && (
          <div className="flex items-center gap-1 bg-gold/10 rounded-full px-2 py-1">
            <Award className="w-4 h-4 text-gold fill-gold" />
            <span className="text-[11px] font-bold text-gold leading-none">Prestige Access</span>
          </div>
        )}
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

      {/* Progress bar — shown until prestige is unlocked (threshold is a surprise) */}
      {!prestigeUnlocked ? (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-gold rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
          />
        </div>
      ) : (
        <p className="text-xs font-semibold text-gold mb-4">Prestige Unlocked!</p>
      )}

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
