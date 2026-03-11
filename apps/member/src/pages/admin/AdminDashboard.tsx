import { MOCK_ADMIN_STATS } from '@devcon-plus/supabase'
import { Users, CalendarDays, Star, Building2 } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const kpiCards = [
  {
    label: 'Total Members',
    value: MOCK_ADMIN_STATS.kpis.totalMembers.toLocaleString(),
    Icon: Users,
    color: 'bg-blue/10 text-blue',
  },
  {
    label: 'Total Events',
    value: MOCK_ADMIN_STATS.kpis.totalEvents.toLocaleString(),
    Icon: CalendarDays,
    color: 'bg-green/10 text-green',
  },
  {
    label: 'XP Distributed',
    value: `${(MOCK_ADMIN_STATS.kpis.xpDistributed / 1_000_000).toFixed(1)}M`,
    Icon: Star,
    color: 'bg-gold/10 text-gold',
  },
  {
    label: 'Active Chapters',
    value: MOCK_ADMIN_STATS.kpis.activeChapters.toLocaleString(),
    Icon: Building2,
    color: 'bg-promoted/10 text-promoted',
  },
]

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">Admin Dashboard</h1>
      <p className="text-sm text-slate-500 mb-6">Platform overview for DEVCON+</p>

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Row 2 — Member Growth Area Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card mt-4">
        <p className="text-base font-bold text-slate-900 mb-4">Member Growth</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={MOCK_ADMIN_STATS.memberGrowth}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area
              dataKey="count"
              fill="#367BDD"
              stroke="#2962C4"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3 — XP by Chapter Horizontal Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card mt-4">
        <p className="text-base font-bold text-slate-900 mb-4">XP by Chapter</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={MOCK_ADMIN_STATS.xpByChapter} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="chapter" type="category" tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v: number) => [v.toLocaleString(), 'XP']} />
            <Bar dataKey="xp" fill="#F8C630" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 4 — Event Attendance Trend Line Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card mt-4">
        <p className="text-base font-bold text-slate-900 mb-4">Event Attendance Trend</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={MOCK_ADMIN_STATS.attendanceTrend}>
            <XAxis dataKey="event" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              dataKey="attendance"
              stroke="#367BDD"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
