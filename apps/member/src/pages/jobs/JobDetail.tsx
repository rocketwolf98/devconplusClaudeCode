import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Briefcase, MapPin, ExternalLink } from 'lucide-react'
import { useJobsStore } from '../../stores/useJobsStore'
import { WORK_TYPE_LABELS } from '../../lib/constants'
import NotFound from '../NotFound'

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { jobs, fetchJobs, isLoading } = useJobsStore()

  useEffect(() => {
    if (jobs.length === 0) void fetchJobs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const job = jobs.find((j) => j.id === id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!job) return <NotFound />

  return (
    <motion.div
      className="min-h-screen bg-slate-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="bg-primary px-4 pt-14 pb-6 rounded-b-3xl">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/80 text-sm mb-4"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          <Briefcase className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white leading-tight">{job.title}</h1>
        <p className="text-white/70 text-sm mt-0.5">{job.company}</p>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs bg-primary/10 text-primary font-semibold px-3 py-1 rounded-full">
            {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
          </span>
          {job.location && (
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.location}
            </span>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 mb-2">About This Role</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>
          </div>
        )}

        {/* Apply CTA */}
        {job.apply_url && (
          <motion.a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
            whileTap={{ scale: 0.95 }}
          >
            <ExternalLink className="w-5 h-5" />
            View Opportunity
          </motion.a>
        )}
      </div>
    </motion.div>
  )
}
