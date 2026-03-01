import { useState } from 'react'
import { Tag, Coffee, Package, Keyboard, Headphones, Shirt, Gift } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { REWARDS } from '@devcon-plus/supabase'
import { usePointsStore } from '../../stores/usePointsStore'
import ComingSoonModal from '../../components/ComingSoonModal'

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
      <div className="bg-gradient-to-br from-blue to-navy px-4 pt-14 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Rewards</h1>
        <p className="text-white/60 text-sm mt-1">
          You have <strong className="text-gold">{totalPoints.toLocaleString()} pts</strong>
        </p>
      </div>

      <div className="bg-slate-50 min-h-screen p-4">
        <div className="grid grid-cols-2 gap-3">
          {REWARDS.map((reward) => {
            const Icon = REWARD_ICONS[reward.name] ?? Gift
            return (
              <button
                key={reward.id}
                onClick={() => setSelected(reward.name)}
                className="bg-white rounded-2xl border border-slate-200 shadow-card text-left overflow-hidden"
              >
                <div className="w-full h-24 bg-gradient-to-br from-blue to-navy flex items-center justify-center">
                  <Icon className="w-10 h-10 text-white/20" />
                </div>
                <div className="p-3 pt-2.5">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">{reward.name}</p>
                  <p className="text-xs font-bold text-blue mt-1">{reward.points_cost.toLocaleString()} pts</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <ComingSoonModal feature={`${selected} redemption`} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
