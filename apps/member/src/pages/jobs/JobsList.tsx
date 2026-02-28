import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Heart, MapPin, Sparkles } from 'lucide-react'
import { useJobsStore } from '../../stores/useJobsStore'
import PromotedBadge from '../../components/PromotedBadge'

const FILTERS = ['All', 'Remote', 'Onsite', 'Hybrid']

const WORK_TYPE_LABEL: Record<string, string> = {
  remote:    'Remote',
  onsite:    'Onsite',
  hybrid:    'Hybrid',
  full_time: 'Full-time',
  part_time: 'Part-time',
}

export default function JobsList() {
  const navigate = useNavigate()
  const { jobs } = useJobsStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const filtered = jobs.filter((j) => {
    const matchSearch =
      search === '' ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'All' || j.work_type.toLowerCase() === filter.toLowerCase()
    return matchSearch && matchFilter
  })

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSaved((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-blue to-navy px-4 pt-14 pb-4 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold mb-3">Jobs Board</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs or companies…"
            className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/20 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                filter === f ? 'bg-blue text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4 space-y-3 pb-8">

        {/* Developer Equity promo card */}
        <div
          className="rounded-2xl p-4 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6B3FA0, #3B5BDE)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-xs font-bold text-white/80">Developer Equity</span>
          </div>
          <p className="text-sm font-bold text-white">Your XP unlocks premium job roles</p>
          <p className="text-xs text-white/60 mt-1">Level up to access exclusive opportunities</p>
        </div>

        {/* Job cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No jobs found</div>
        ) : (
          filtered.map((job) => (
            <button
              key={job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="w-full bg-white rounded-2xl border border-slate-200 shadow-card p-4 text-left relative"
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
                  onClick={(e) => toggleSave(job.id, e)}
                  className="shrink-0 p-1 -mt-0.5"
                  aria-label={saved.has(job.id) ? 'Unsave job' : 'Save job'}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      saved.has(job.id) ? 'fill-red text-red' : 'text-slate-300'
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
                  {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
                </span>
              </div>

              {/* CTA row */}
              <div className="mt-3 border border-slate-200 rounded-xl py-2 text-center">
                <span className="text-sm font-semibold text-slate-700">View Opportunity</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
