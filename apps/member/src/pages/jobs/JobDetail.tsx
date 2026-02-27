import { useParams, useNavigate } from 'react-router-dom'
import { useJobsStore } from '../../stores/useJobsStore'
import PromotedBadge from '../../components/PromotedBadge'

const workTypeLabel: Record<string, string> = {
  remote:    '🌐 Remote',
  onsite:    '🏢 Onsite',
  hybrid:    '🔀 Hybrid',
  full_time: 'Full-time',
  part_time: 'Part-time',
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { jobs, savedIds, toggleSave } = useJobsStore()
  const job = jobs.find((j) => j.id === id)

  if (!job) return <div className="p-4 text-center text-slate-400 pt-20">Job not found</div>

  const isSaved = savedIds.includes(job.id)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-navy px-4 pt-14 pb-6 relative">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">← Back</button>
        {job.is_promoted && <div className="absolute top-14 right-4"><PromotedBadge /></div>}
        <p className="text-white/60 text-xs">{job.company}</p>
        <h1 className="text-white text-xl font-bold">{job.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="bg-white/10 text-white/80 text-xs px-2 py-0.5 rounded-full">
            {workTypeLabel[job.work_type] ?? job.work_type}
          </span>
          {job.location && <span className="text-white/60 text-xs">📍 {job.location}</span>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {job.description && (
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">About the Role</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => toggleSave(job.id)}
            className={`flex-1 py-3 rounded-2xl font-semibold text-sm border transition-colors ${
              isSaved ? 'border-blue bg-blue/10 text-blue' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {isSaved ? '✓ Saved' : 'Save'}
          </button>
          <a
            href={job.apply_url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-blue text-white text-center"
          >
            Apply Now
          </a>
        </div>
      </div>
    </div>
  )
}
