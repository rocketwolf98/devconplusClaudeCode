import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePointsStore } from '../../stores/usePointsStore'

const EARN = [
  { icon: '🎫', label: 'Attend an Event',   pts: '100–300 pts' },
  { icon: '🎤', label: 'Speak at an Event', pts: '700 pts'     },
  { icon: '🙋', label: 'Volunteer',         pts: '100–500 pts' },
  { icon: '☕', label: 'Brown Bag Session', pts: '250 pts'     },
]

const SHARE = [
  { icon: '❤️', label: 'Like Content',          pts: '5 pts'     },
  { icon: '🔗', label: 'Share + Submit Link',   pts: '10–25 pts' },
]

export default function Points() {
  const navigate = useNavigate()
  const { totalPoints } = usePointsStore()
  const [tab, setTab] = useState<'earn' | 'share'>('earn')
  const items = tab === 'earn' ? EARN : SHARE

  return (
    <div>
      <div className="bg-navy px-4 pt-14 pb-6">
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
                tab === t ? 'bg-blue text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {t === 'earn' ? 'Ways to Earn' : 'Share & Earn'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-3">
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-slate-900 text-sm">{item.label}</p>
                <span className="text-xs font-bold text-blue">{item.pts}</span>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => navigate('/points/history')}
          className="w-full mt-2 bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-2xl text-sm shadow-card"
        >
          View Points History
        </button>
      </div>
    </div>
  )
}
