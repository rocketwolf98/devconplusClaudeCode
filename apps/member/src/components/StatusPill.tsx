type Status = 'pending' | 'approved' | 'rejected' | 'upcoming' | 'ongoing' | 'past'

const styles: Record<Status, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green/10 text-green',
  rejected: 'bg-red/10 text-red',
  upcoming: 'bg-primary/10 text-primary',
  ongoing:  'bg-green/10 text-green',
  past:     'bg-slate-100 text-slate-500',
}

const labels: Record<Status, string> = {
  pending:  'Pending',
  approved: "You're In!",
  rejected: 'Rejected',
  upcoming: 'Upcoming',
  ongoing:  'Ongoing',
  past:     'Past',
}

export default function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
