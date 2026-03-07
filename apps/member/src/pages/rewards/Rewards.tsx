import { useState, useEffect } from 'react'
import { Tag, Coffee, Package, Keyboard, Headphones, Shirt, Gift, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePointsStore } from '../../stores/usePointsStore'
import { useRewardsStore } from '../../stores/useRewardsStore'
import ComingSoonModal from '../../components/ComingSoonModal'
import { SkeletonRewardCard } from '../../components/Skeleton'
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
  const { rewards, fetchRewards, isLoading } = useRewardsStore()
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => { void fetchRewards() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Rewards</h1>
        <p className="text-white/60 text-sm mt-1">
          You have <strong className="text-gold">{totalPoints.toLocaleString()} pts</strong>
        </p>
      </div>

      <div className="bg-slate-50 min-h-screen p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonRewardCard key={i} />)}
          </div>
        ) : rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 px-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Rewards coming soon</h3>
            <p className="text-sm text-slate-500 text-center">
              Keep earning points — exciting rewards will be available here shortly!
            </p>
          </div>
        ) : (
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {rewards.map((reward) => {
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
                  <div className="w-full h-24 bg-primary flex items-center justify-center">
                    <Icon className="w-10 h-10 text-white/20" />
                  </div>
                )}
                <div className="p-3 pt-2.5">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">{reward.name}</p>
                  <p className="text-xs font-bold text-primary mt-1">{reward.points_cost.toLocaleString()} pts</p>
                </div>
              </motion.button>
            )
          })}
        </motion.div>
        )}
      </div>

      {selected && (
        <ComingSoonModal feature={`${selected} redemption`} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
