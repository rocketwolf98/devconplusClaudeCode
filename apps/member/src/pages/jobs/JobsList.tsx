import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, ChevronDown, MapPin, ExternalLink } from 'lucide-react'
import { useJobsStore } from '../../stores/useJobsStore'
import { SkeletonJobCard } from '../../components/Skeleton'
import PromotedBadge from '../../components/PromotedBadge'
import { WORK_TYPE_LABELS } from '../../lib/constants'
import { staggerContainer, cardItem } from '../../lib/animation'

export default function JobsList() {
  const { jobs, isLoading, error, fetchJobs } = useJobsStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    void fetchJobs()
  }, [fetchJobs])

  const toggle = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id))

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-primary px-4 pt-14 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Jobs Board</h1>
        <p className="text-white/70 text-sm mt-0.5">
          Global opportunities for Filipino developers
        </p>
      </div>

      <div className="flex-1 px-4 pt-5 pb-24">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonJobCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button
              onClick={() => void fetchJobs()}
              className="text-sm text-primary font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-primary/50" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">No listings yet</h2>
            <p className="text-sm text-slate-500">Check back soon for new opportunities.</p>
          </div>
        )}

        {/* Job list */}
        {!isLoading && !error && jobs.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {jobs.map(job => {
              const isExpanded = expandedId === job.id
              return (
                <motion.div
                  key={job.id}
                  variants={cardItem}
                  className="bg-white rounded-2xl shadow-card overflow-hidden"
                >
                  {/* Header row — always visible, tap to expand */}
                  <motion.button
                    onClick={() => toggle(job.id)}
                    className="w-full p-4 text-left"
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 text-sm leading-snug">
                            {job.title}
                          </p>
                          {job.is_promoted && <PromotedBadge />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {job.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="shrink-0 mt-0.5"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </motion.div>
                    </div>
                  </motion.button>

                  {/* Expanded body */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-4">
                          {job.description ? (
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                              {job.description}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">
                              No description provided.
                            </p>
                          )}

                          {job.apply_url && (
                            <a
                              href={job.apply_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full bg-primary text-white font-semibold text-sm py-3 rounded-xl"
                            >
                              Apply Now
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
