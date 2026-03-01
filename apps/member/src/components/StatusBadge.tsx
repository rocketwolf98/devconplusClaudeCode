interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected'
}

const CONFIG = {
  pending:  { label: 'Pending',  className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border border-green-200'   },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border border-red-200'         },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}
