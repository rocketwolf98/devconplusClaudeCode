import { useState } from 'react'
import { Tag, Coffee, Package, Keyboard, Headphones, Shirt, Gift } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { REWARDS } from '@devcon-plus/supabase'
import { usePointsStore } from '../../stores/usePointsStore'
import ComingSoonModal from '../../components/ComingSoonModal'
import { staggerContainer, cardItem } from '../../lib/animation'

const REWARD_ICONS: Record<string, LucideIcon> = {
  'Lanyard':        Tag,
  'Coffee Voucher': Coffee,
  'DEVCON Cap':     Package,
  'Keyboard':       Keyboard,
  'Headset':        Headphones,
  'DEVCON Shirt':   Shirt,
  'DEVCON Mug':     Gift,
}

export default function Rewards() {
  const { totalPoints } = usePointsStore()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div>
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Rewards</h1>
        <p className="text-white/60 text-sm mt-1">
          You have <strong className="text-gold">{totalPoints.toLocaleString()} pts</strong>
        </p>
      </div>

      <div className="bg-slate-50 min-h-screen p-4">
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {REWARDS.map((reward) => {
            const Icon = REWARD_ICONS[reward.name] ?? Gift
            return (
              <motion.button
                key={reward.id}
                variants={cardItem}
                onClick={() => setSelected(reward.name)}
                className="bg-white rounded-2xl border border-slate-200 shadow-card text-left overflow-hidden"
                whileTap={{ scale: 0.96 }}
              >
                {reward.image_url ? (
                  <img src={reward.image_url} alt={reward.name} className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-blue flex items-center justify-center">
                    <Icon className="w-10 h-10 text-white/20" />
                  </div>
                )}
                <div className="p-3 pt-2.5">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">{reward.name}</p>
                  <p className="text-xs font-bold text-blue mt-1">{reward.points_cost.toLocaleString()} pts</p>
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {selected && (
        <ComingSoonModal feature={`${selected} redemption`} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
