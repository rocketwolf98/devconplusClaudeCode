import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EVENTS } from '@devcon-plus/supabase'
import { ApprovalCard, type Registration } from '../../components/ApprovalCard'

const MOCK_REGISTRANTS: Registration[] = [
  {
    id: 'r1',
    member_name: 'Ana Reyes',
    member_email: 'ana.reyes@email.com',
    school_or_company: 'Ateneo de Manila University',
    event_title: 'DEVCON Summit Manila 2026',
    registered_at: '2026-02-24T09:15:00Z',
    status: 'pending',
  },
  {
    id: 'r2',
    member_name: 'Carlo Bautista',
    member_email: 'carlo.bautista@company.com',
    school_or_company: 'Accenture Philippines',
    event_title: 'DEVCON Summit Manila 2026',
    registered_at: '2026-02-24T10:30:00Z',
    status: 'pending',
  },
  {
    id: 'r3',
    member_name: 'Pia Gonzales',
    member_email: 'pia.gonzales@email.com',
    school_or_company: 'De La Salle University',
    event_title: 'DEVCON Summit Manila 2026',
    registered_at: '2026-02-23T14:00:00Z',
    status: 'approved',
  },
]

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export function EventRegistrants() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const event = EVENTS.find((e) => e.id === id)
  const [registrants, setRegistrants] = useState<Registration[]>(
    MOCK_REGISTRANTS.map((r) => ({ ...r, event_title: event?.title ?? r.event_title }))
  )
  const [filter, setFilter] = useState<FilterStatus>('all')

  const handleApprove = (regId: string) => {
    setRegistrants((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status: 'approved' as const } : r))
    )
  }

  const handleReject = (regId: string) => {
    setRegistrants((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status: 'rejected' as const } : r))
    )
  }

  const filtered = filter === 'all' ? registrants : registrants.filter((r) => r.status === filter)

  const counts = {
    all: registrants.length,
    pending: registrants.filter((r) => r.status === 'pending').length,
    approved: registrants.filter((r) => r.status === 'approved').length,
    rejected: registrants.filter((r) => r.status === 'rejected').length,
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
      >
        ← Back
      </button>

      <h1 className="text-xl font-black text-slate-900 mb-1">Registrants</h1>
      <p className="text-sm text-slate-400 mb-5">{event?.title ?? 'Event'}</p>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
        {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
              filter === f
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Approve all button */}
      {filter === 'pending' && counts.pending > 0 && (
        <button
          onClick={() => {
            setRegistrants((prev) =>
              prev.map((r) => (r.status === 'pending' ? { ...r, status: 'approved' as const } : r))
            )
          }}
          className="mb-4 px-4 py-2 bg-green text-white text-sm font-bold rounded-xl hover:bg-green/90 transition-colors"
        >
          ✓ Approve All Pending ({counts.pending})
        </button>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-base font-bold text-slate-700">No registrants found</p>
          <p className="text-sm text-slate-400 mt-1">
            {filter === 'all' ? 'No one has registered yet.' : `No ${filter} registrations.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((reg) => (
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
  )
}
