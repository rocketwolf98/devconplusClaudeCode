import { useNavigate } from 'react-router-dom'
import { usePointsStore } from '../stores/usePointsStore'
import { MOCK_PROFILE_XP_NEXT_MILESTONE, MOCK_PROFILE_XP_PROGRESS } from '@devcon-plus/supabase'

export default function XPCard() {
  const navigate = useNavigate()
  const { totalPoints } = usePointsStore()

  return (
    <div className="mx-4 bg-navy rounded-2xl p-4 shadow-primary">
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="text-white/60 text-xs">Your Points</p>
          <p className="text-white text-2xl font-bold">{totalPoints.toLocaleString()} pts</p>
        </div>
        <button
          onClick={() => navigate('/rewards')}
          className="bg-primary px-3 py-1.5 rounded-xl text-white text-xs font-semibold"
        >
          Redeem Now
        </button>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full bg-gold rounded-full transition-all"
          style={{ width: `${MOCK_PROFILE_XP_PROGRESS}%` }}
        />
      </div>
      <p className="text-white/50 text-xs">
        {MOCK_PROFILE_XP_NEXT_MILESTONE.toLocaleString()} pts to next reward tier
      </p>
    </div>
  )
}
