import { useEffect, useState } from 'react'
import { Users, CalendarDays, Building2, KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Stats {
  users: number
  events: number
  chapters: number
  orgCodes: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, events: 0, chapters: 0, orgCodes: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [users, events, chapters, orgCodes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
        supabase.from('organizer_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])
      setStats({
        users: users.count ?? 0,
        events: events.count ?? 0,
        chapters: chapters.count ?? 0,
        orgCodes: orgCodes.count ?? 0,
      })
      setIsLoading(false)
    }
    void load()
  }, [])

  const cards = [
    { label: 'Total Members', value: stats.users,    Icon: Users,        color: 'bg-blue/10 text-blue'    },
    { label: 'Total Events',  value: stats.events,   Icon: CalendarDays, color: 'bg-green/10 text-green'  },
    { label: 'Chapters',      value: stats.chapters, Icon: Building2,    color: 'bg-gold/10 text-gold'    },
    { label: 'Active Codes',  value: stats.orgCodes, Icon: KeyRound,     color: 'bg-promoted/10 text-promoted' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">Admin Dashboard</h1>
      <p className="text-sm text-slate-500 mb-8">Platform overview for DEVCON+</p>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading stats…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
