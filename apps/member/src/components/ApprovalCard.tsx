import { Check, X, CheckCircle2, XCircle, RotateCcw, UserCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from './StatusBadge'

export interface Registration {
  id: string
  member_name: string
  member_email: string
  school_or_company: string
  event_title: string
  registered_at: string
  status: 'pending' | 'approved' | 'rejected'
  checked_in?: boolean
}

interface ApprovalCardProps {
  registration: Registration
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onRevert: (id: string) => void
  onCheckIn?: (id: string) => void
}

export function ApprovalCard({ registration, onApprove, onReject, onRevert, onCheckIn }: ApprovalCardProps) {
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
      <div className="flex items-start gap-3 mb-3">
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

      <div className="bg-slate-50 rounded-xl px-3 py-2 mb-3">
        <p className="text-xs text-slate-400 mb-0.5">Event</p>
        <p className="text-sm font-semibold text-slate-700 truncate">{registration.event_title}</p>
        <p className="text-xs text-slate-400 mt-1">Registered {formattedDate}</p>
      </div>

      {registration.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onReject(registration.id)}
            className="flex-1 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-red/5 hover:border-red hover:text-red transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
          <button
            onClick={() => onApprove(registration.id)}
            className="flex-1 py-2 text-sm font-semibold rounded-xl bg-blue text-white hover:bg-blue-dark transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
        </div>
      )}

      {registration.status === 'approved' && !registration.checked_in && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onCheckIn?.(registration.id)}
          className="w-full py-2 text-sm font-semibold rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Check In
        </motion.button>
      )}
      {registration.status === 'approved' && registration.checked_in && (
        <p className="text-xs text-green font-semibold text-center py-1 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Checked In
        </p>
      )}

      {registration.status === 'rejected' && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-red font-semibold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            Registration rejected
          </p>
          <button
            onClick={() => onRevert(registration.id)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
