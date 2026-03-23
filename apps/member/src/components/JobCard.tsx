import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Job } from '@devcon-plus/supabase'
import PromotedBadge from './PromotedBadge'
import { WORK_TYPE_LABELS } from '../lib/constants'

function JobCard({ job }: { job: Job }) {
  const navigate = useNavigate()
  return (
    <motion.button
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="w-full bg-white rounded-2xl shadow-card p-4 text-left relative"
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {job.is_promoted && (
        <div className="absolute top-3 right-3 z-10">
          <PromotedBadge />
        </div>
      )}
      <p className="font-semibold text-slate-900 text-sm pr-16">{job.title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
          {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
        </span>
        {job.location && <span className="text-xs text-slate-400">{job.location}</span>}
      </div>
    </motion.button>
  )
}

export default memo(JobCard)
