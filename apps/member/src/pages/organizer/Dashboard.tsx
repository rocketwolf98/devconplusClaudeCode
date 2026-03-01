import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { OrgBanner } from '../../components/OrgBanner'
import { ApprovalCard, type Registration } from '../../components/ApprovalCard'
import { useOrgAuthStore } from '../../stores/useOrgAuthStore'

const MOCK_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-1',
    member_name: 'Ana Reyes',
    member_email: 'ana.reyes@email.com',
    school_or_company: 'Ateneo de Manila University',
    event_title: 'DEVCON Summit Manila 2026',
    registered_at: '2026-02-24T09:15:00Z',
    status: 'pending',
  },
  {
    id: 'reg-2',
    member_name: 'Carlo Bautista',
    member_email: 'carlo.bautista@company.com',
    school_or_company: 'Accenture Philippines',
    event_title: 'DEVCON Summit Manila 2026',
    registered_at: '2026-02-24T10:30:00Z',
    status: 'pending',
  },
  {
    id: 'reg-3',
    member_name: 'Pia Gonzales',
    member_email: 'pia.gonzales@email.com',
    school_or_company: 'De La Salle University',
    event_title: 'Kids Hour of AI — Manila',
    registered_at: '2026-02-23T14:00:00Z',
    status: 'approved',
  },
  {
    id: 'reg-4',
    member_name: 'Reymar Santos',
    member_email: 'reymar@startup.ph',
    school_or_company: 'PayMongo',
    event_title: 'DEVCON Summit Manila 2026',
    registered_at: '2026-02-23T16:45:00Z',
    status: 'pending',
  },
]

type TabId = 'approvals' | 'events'

export function OrgDashboard() {
  const { user } = useOrgAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('approvals')
  const [registrations, setRegistrations] = useState<Registration[]>(MOCK_REGISTRATIONS)

  if (!user) return null

  const pending = registrations.filter((r) => r.status === 'pending')
  const stats = [
    { label: 'Events',  value: 5    },
    { label: 'Members', value: 1243 },
    { label: 'Pending', value: pending.length },
  ]

  const handleApprove = (id: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r))
    )
  }

  const handleReject = (id: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r))
    )
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue to-navy px-4 pt-14 pb-8 rounded-b-3xl">
        <OrgBanner
          chapterName={user.chapter}
          role={user.role === 'hq_admin' ? 'HQ Admin' : 'Chapter Officer'}
          stats={stats}
        />
      </div>

      <div className="p-4">
        <div className="flex gap-1 mt-2 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {(['approvals', 'events'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'approvals'
                ? `Approvals${pending.length > 0 ? ` (${pending.length})` : ''}`
                : 'Events'}
            </button>
          ))}
        </div>

        {activeTab === 'approvals' && (
          <div>
            {pending.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-green" />
                </div>
                <p className="text-base font-bold text-slate-700">All caught up!</p>
                <p className="text-sm text-slate-400 mt-1">No pending registrations right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 mb-2">
                  {pending.length} registration{pending.length !== 1 ? 's' : ''} awaiting approval
                </p>
                {registrations.map((reg) => (
                  <ApprovalCard
                    key={reg.id}
                    registration={reg}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">Your chapter events</p>
              <button
                onClick={() => navigate('/organizer/events/create')}
                className="px-4 py-2 bg-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-dark transition-colors"
              >
                + New Event
              </button>
            </div>
            <button
              onClick={() => navigate('/organizer/events')}
              className="text-sm text-blue font-semibold hover:underline"
            >
              View all events →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
