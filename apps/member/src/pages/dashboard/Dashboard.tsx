import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import { useJobsStore } from '../../stores/useJobsStore'
import XPCard from '../../components/XPCard'
import EventCard from '../../components/EventCard'
import JobCard from '../../components/JobCard'
import NewsCard from '../../components/NewsCard'
import { NEWS_POSTS } from '@devcon-plus/supabase'

const BANNERS = [
  { tag: '#SHEISDEVCON',       sub: 'Empowering women in tech' },
  { tag: 'KIDS HOUR OF AI',    sub: 'Introducing AI to the next gen' },
  { tag: '16 YEARS ANNIV',     sub: 'Celebrating 16 years of DEVCON' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { events } = useEventsStore()
  const { jobs } = useJobsStore()
  const [bannerIdx, setBannerIdx] = useState(0)

  // Rotate hero banner every 4 seconds
  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const banner = BANNERS[bannerIdx]
  const forYouEvents = events.filter((e) => e.status === 'upcoming').slice(0, 3)
  const hotJobs = jobs.slice(0, 3)
  const devconNews = NEWS_POSTS.filter((p) => p.category === 'devcon')
  const techNews   = NEWS_POSTS.filter((p) => p.category === 'tech_community')

  return (
    <div>
      {/* 1. Dynamic hero header */}
      <div className="bg-navy px-4 pt-14 pb-5">
        <p className="text-white/60 text-xs">Welcome back,</p>
        <h1 className="text-white text-xl font-bold">{user?.full_name ?? 'Member'}</h1>
        <div
          className="mt-3 bg-white/10 rounded-xl px-3 py-2 cursor-pointer"
          onClick={() => setBannerIdx((i) => (i + 1) % BANNERS.length)}
        >
          <p className="text-white/50 text-[10px] uppercase tracking-widest">{banner.sub}</p>
          <p className="text-gold text-sm font-extrabold tracking-wide">{banner.tag}</p>
          <div className="flex gap-1 mt-2">
            {BANNERS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i === bannerIdx ? 'w-4 bg-gold' : 'w-1 bg-white/30'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. XP Card */}
      <div className="bg-navy pb-5">
        <XPCard />
      </div>

      {/* Sections */}
      <div className="bg-slate-50 space-y-6 pb-8">
        {/* 3. Events For You */}
        <section className="pt-6">
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">Events For You</h2>
            <button onClick={() => navigate('/events')} className="text-xs text-blue font-semibold">
              See All
            </button>
          </div>
          <div className="px-4 space-y-3">
            {forYouEvents.map((e) => <EventCard key={e.id} event={e} compact />)}
          </div>
        </section>

        {/* 4. Hot Jobs */}
        <section>
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">Hot Jobs</h2>
            <button onClick={() => navigate('/jobs')} className="text-xs text-blue font-semibold">
              See All
            </button>
          </div>
          <div className="px-4 space-y-3">
            {hotJobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>

        {/* 5. DEVCON Updates */}
        <section>
          <h2 className="text-base font-bold text-slate-900 px-4 mb-3">DEVCON Updates</h2>
          <div className="px-4 space-y-3">
            {devconNews.map((p) => <NewsCard key={p.id} post={p} />)}
          </div>
        </section>

        {/* 6. Tech Community Updates */}
        <section>
          <h2 className="text-base font-bold text-slate-900 px-4 mb-3">Tech Community Updates</h2>
          <div className="px-4 space-y-3">
            {techNews.map((p) => <NewsCard key={p.id} post={p} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
