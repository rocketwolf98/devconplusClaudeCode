import { useState } from 'react'
import { useJobsStore } from '../../stores/useJobsStore'
import JobCard from '../../components/JobCard'

const FILTERS = ['All', 'Remote', 'Onsite', 'Hybrid']

export default function JobsList() {
  const { jobs } = useJobsStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = jobs.filter((j) => {
    const matchSearch =
      search === '' ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'All' || j.work_type.toLowerCase() === filter.toLowerCase()
    return matchSearch && matchFilter
  })

  return (
    <div>
      <div className="bg-navy px-4 pt-14 pb-4">
        <h1 className="text-white text-xl font-bold mb-3">Jobs Board</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs or companies…"
          className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-2.5 text-sm border border-white/20 focus:outline-none"
        />
        <div className="flex gap-2 mt-3">
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

      <div className="bg-slate-50 min-h-screen p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No jobs found</div>
        ) : (
          filtered.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </div>
    </div>
  )
}
