import { useNavigate } from 'react-router-dom'
import type { Job } from '@devcon-plus/supabase'
import PromotedBadge from './PromotedBadge'

const workTypeLabel: Record<string, string> = {
  remote:    'Remote',
  onsite:    'Onsite',
  hybrid:    'Hybrid',
  full_time: 'Full-time',
  part_time: 'Part-time',
}

export default function JobCard({ job }: { job: Job }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="w-full bg-white rounded-2xl shadow-card p-4 text-left relative"
    >
      {job.is_promoted && (
        <div className="absolute top-3 right-3">
          <PromotedBadge />
        </div>
      )}
      <p className="font-semibold text-slate-900 text-sm pr-16">{job.title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
          {workTypeLabel[job.work_type] ?? job.work_type}
        </span>
        {job.location && <span className="text-xs text-slate-400">{job.location}</span>}
      </div>
    </button>
  )
}
