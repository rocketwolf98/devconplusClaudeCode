import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SETTINGS = [
  { key: 'event_updates', label: 'Event Updates', desc: 'Registration confirmations and reminders' },
  { key: 'points_earned', label: 'Points Earned', desc: 'When you earn or redeem points'           },
  { key: 'new_events',    label: 'New Events',    desc: 'Events from your chapter'                 },
  { key: 'job_alerts',    label: 'Job Alerts',    desc: 'New jobs on the board'                    },
]

export default function Notifications() {
  const navigate = useNavigate()
  const [on, setOn] = useState<Record<string, boolean>>(
    Object.fromEntries(SETTINGS.map((s) => [s.key, true]))
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-xl font-bold">Notifications</h1>
      </div>

      <div className="p-4 space-y-2">
        {SETTINGS.map((s) => (
          <div key={s.key} className="bg-white rounded-2xl shadow-card px-4 py-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-slate-900 text-sm">{s.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
            </div>
            <button
              onClick={() => setOn((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
              className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on[s.key] ? 'bg-primary' : 'bg-slate-200'}`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${on[s.key] ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
