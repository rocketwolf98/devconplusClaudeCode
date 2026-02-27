import { StatusBadge } from './StatusBadge'

export interface Registration {
  id: string
  member_name: string
  member_email: string
  school_or_company: string
  event_title: string
  registered_at: string
  status: 'pending' | 'approved' | 'rejected'
}

interface ApprovalCardProps {
  registration: Registration
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function ApprovalCard({ registration, onApprove, onReject }: ApprovalCardProps) {
  const initials = registration.member_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const formattedDate = new Date(registration.registered_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center text-blue text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{registration.member_name}</p>
          <p className="text-xs text-slate-400 truncate">{registration.member_email}</p>
          <p className="text-xs text-slate-400 truncate">{registration.school_or_company}</p>
        </div>
        <StatusBadge status={registration.status} />
      </div>

      <div className="bg-slate-50 rounded-lg px-3 py-2 mb-3">
        <p className="text-xs text-slate-400 mb-0.5">Event</p>
        <p className="text-sm font-semibold text-slate-700 truncate">{registration.event_title}</p>
        <p className="text-xs text-slate-400 mt-1">Registered {formattedDate}</p>
      </div>

      {registration.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onReject(registration.id)}
            className="flex-1 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-red/5 hover:border-red hover:text-red transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(registration.id)}
            className="flex-1 py-2 text-sm font-semibold rounded-lg bg-blue text-white hover:bg-blue-dark transition-colors"
          >
            Approve ✓
          </button>
        </div>
      )}

      {registration.status === 'approved' && (
        <p className="text-xs text-green font-semibold text-center py-1">
          ✓ Approved — QR ticket sent
        </p>
      )}

      {registration.status === 'rejected' && (
        <p className="text-xs text-red font-semibold text-center py-1">
          ✗ Registration rejected
        </p>
      )}
    </div>
  )
}
