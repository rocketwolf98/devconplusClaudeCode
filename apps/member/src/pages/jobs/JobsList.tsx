import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Heart, MapPin, Sparkles, Bookmark } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJobsStore } from '../../stores/useJobsStore'
import PromotedBadge from '../../components/PromotedBadge'
import { staggerContainer, cardItem, fadeUp } from '../../lib/animation'
import { WORK_TYPE_LABELS } from '../../lib/constants'

const FILTERS = ['All', 'Remote', 'Onsite', 'Hybrid', 'Saved']

export default function JobsList() {
  const navigate = useNavigate()
  const { jobs, savedIds, toggleSave } = useJobsStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const handleToggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSave(id)
  }

  const isSavedTab = filter === 'Saved'

  const visibleJobs = jobs.filter((j) => {
    const matchSearch =
      search === '' ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase())
    if (isSavedTab) return matchSearch && savedIds.includes(j.id)
    const matchFilter = filter === 'All' || j.work_type.toLowerCase() === filter.toLowerCase()
    return matchSearch && matchFilter
  })

  return (
    <div>
      {/* ── Header ── */}
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-4 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold mb-3">Jobs Board</h1>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs or companies…"
            className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/20 focus:outline-none"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                filter === f ? 'bg-white text-blue' : 'bg-white/20 text-white'
              }`}
            >
              {f === 'Saved' && <Bookmark className="w-3 h-3" />}
              {(f === 'Saved' && savedIds.length > 0) ? `Saved (${savedIds.length})` : f}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          className="bg-slate-50 min-h-screen p-4 space-y-3 pb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {/* Developer Equity promo — hidden on Saved filter */}
          {!isSavedTab && (
            <motion.div
              variants={fadeUp}
              className="rounded-2xl p-4 overflow-hidden bg-blue"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-gold" />
                <span className="text-xs font-bold text-white/80">Developer Equity</span>
              </div>
              <p className="text-sm font-bold text-white">Your XP unlocks premium job roles</p>
              <p className="text-xs text-white/60 mt-1">Level up to access exclusive opportunities</p>
            </motion.div>
          )}

          {/* Empty state */}
          {visibleJobs.length === 0 && (
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center mb-3">
                <Bookmark className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">
                {isSavedTab ? 'No saved jobs yet' : 'No jobs found'}
              </p>
              {isSavedTab && (
                <p className="text-xs text-slate-400 mt-1 max-w-[180px]">
                  Tap the heart on any job to save it here
                </p>
              )}
            </motion.div>
          )}

          {/* Job cards */}
          {visibleJobs.map((job) => (
            <motion.button
              key={job.id}
              variants={cardItem}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="w-full bg-white rounded-2xl border border-slate-200 shadow-card p-4 text-left relative"
              whileTap={{ scale: 0.98 }}
            >
              {job.is_promoted && (
                <div className="absolute top-3 right-3">
                  <PromotedBadge />
                </div>
              )}

              {/* Top row: company avatar + title + save */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center text-sm font-bold text-blue shrink-0">
                    {job.company.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{job.company}</p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{job.title}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleToggleSave(job.id, e)}
                  className="shrink-0 p-1 -mt-0.5"
                  aria-label={savedIds.includes(job.id) ? 'Unsave job' : 'Save job'}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      savedIds.includes(job.id) ? 'fill-red text-red' : 'text-slate-300'
                    }`}
                  />
                </button>
              </div>

              {/* Meta chips */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {job.location}
                </span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
                </span>
              </div>

              {/* CTA row */}
              <div className="mt-3 border border-slate-200 rounded-xl py-2 text-center">
                <span className="text-sm font-semibold text-slate-700">View Opportunity</span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
