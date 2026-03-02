import { useNavigate } from 'react-router-dom'
import { Ticket, Mic2, HandHeart, Coffee, Heart, Share2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePointsStore } from '../../stores/usePointsStore'
import { staggerContainer, cardItem } from '../../lib/animation'

const EARN: { Icon: LucideIcon; label: string; pts: string }[] = [
  { Icon: Ticket,    label: 'Attend an Event',   pts: '100–300 pts' },
  { Icon: Mic2,      label: 'Speak at an Event', pts: '700 pts'     },
  { Icon: HandHeart, label: 'Volunteer',         pts: '100–500 pts' },
  { Icon: Coffee,    label: 'Brown Bag Session', pts: '250 pts'     },
]

const SHARE: { Icon: LucideIcon; label: string; pts: string }[] = [
  { Icon: Heart,  label: 'Like Content',        pts: '5 pts'     },
  { Icon: Share2, label: 'Share + Submit Link', pts: '10–25 pts' },
]

export default function Points() {
  const navigate = useNavigate()
  const { totalPoints } = usePointsStore()
  const [tab, setTab] = useState<'earn' | 'share'>('earn')
  const items = tab === 'earn' ? EARN : SHARE

  return (
    <div>
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Points+</h1>
        <p className="text-white/60 text-sm mt-1">
          You have <strong className="text-gold">{totalPoints.toLocaleString()} pts</strong>
        </p>
        <div className="flex gap-2 mt-4">
          {(['earn', 'share'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? 'bg-white text-blue font-semibold' : 'bg-white/20 text-white'
              }`}
            >
              {t === 'earn' ? 'Ways to Earn' : 'Share & Earn'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {items.map((item) => (
              <motion.div
                key={item.label}
                variants={cardItem}
                className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center shrink-0">
                  <item.Icon className="w-5 h-5 text-blue" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-slate-900 text-sm">{item.label}</p>
                    <span className="text-xs font-bold text-blue">{item.pts}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => navigate('/points/history')}
          className="w-full mt-4 bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-2xl text-sm shadow-card"
        >
          View Points History
        </button>
      </div>
    </div>
  )
}
