import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Heart, Gift, ChevronRight, MapPin, Flame, Star } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import { useJobsStore } from '../../stores/useJobsStore'
import { usePointsStore } from '../../stores/usePointsStore'
import EventCard from '../../components/EventCard'
import NewsCard from '../../components/NewsCard'
import PromotedBadge from '../../components/PromotedBadge'
import ComingSoonModal from '../../components/ComingSoonModal'
import { NEWS_POSTS, MOCK_PROFILE_INITIALS, MOCK_PROFILE_XP_NEXT_MILESTONE } from '@devcon-plus/supabase'

const BANNERS = [
  {
    title:    '#SheIsDEVCON',
    sub:      'DEVCON Philippines · Nationwide',
    cta:      'Learn More',
    gradient: 'from-purple-700 via-pink-600 to-rose-500',
    onClick:  (navigate: ReturnType<typeof useNavigate>) => navigate('/events'),
  },
  {
    title:    'Kids Hour of AI',
    sub:      'DEVCON Philippines · All Chapters',
    cta:      'Register Now',
    gradient: 'from-blue via-sky-500 to-cyan-400',
    onClick:  (navigate: ReturnType<typeof useNavigate>) => navigate('/events'),
  },
  {
    title:    '16 Years of DEVCON',
    sub:      'DEVCON Philippines · Celebrating Tech',
    cta:      'See Highlights',
    gradient: 'from-navy via-blue to-indigo-400',
    onClick:  (navigate: ReturnType<typeof useNavigate>) => navigate('/events'),
  },
]

const WORK_TYPE_LABEL: Record<string, string> = {
  remote:    'Remote',
  onsite:    'Onsite',
  hybrid:    'Hybrid',
  full_time: 'Full-time',
  part_time: 'Part-time',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { events } = useEventsStore()
  const { jobs } = useJobsStore()
  const { transactions, totalPoints } = usePointsStore()
  const [bannerIdx, setBannerIdx] = useState(0)
  const [newsTab, setNewsTab] = useState<'devcon' | 'community'>('devcon')
  const [showVolunteerModal, setShowVolunteerModal] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const xpSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const el = xpSectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const banner = BANNERS[bannerIdx]
  const handleBannerCta = () => banner.onClick(navigate)
  const firstName = user?.full_name?.split(' ')[0] ?? 'Member'
  const progressPct = Math.min((totalPoints / MOCK_PROFILE_XP_NEXT_MILESTONE) * 100, 100)
  const forYouEvents = events.filter((e) => e.status === 'upcoming').slice(0, 3)
  const hotJobs = jobs.slice(0, 4)
  const visibleNews = newsTab === 'devcon'
    ? NEWS_POSTS.filter((p) => p.category === 'devcon')
    : NEWS_POSTS.filter((p) => p.category === 'tech_community')
  const recentTxns = transactions.slice(0, 4)

  return (
    <div>
      {/* ── Sticky greeting bar ── */}
      <div
        className="sticky top-0 z-40 bg-gradient-to-br from-blue to-navy px-6 pt-14 pb-6"
        style={isScrolled ? { borderRadius: '0 0 100% 100% / 0 0 40px 40px' } : undefined}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-white text-3xl font-black">Hi, {firstName}!</h1>
          <div className="flex items-baseline gap-0.5">
            <span className="text-white font-black text-lg tracking-tight">DEVCON</span>
            <span className="text-gold font-black text-xl">+</span>
          </div>
        </div>
      </div>

      {/* ── Collapsible: XP card ── */}
      <div
        ref={xpSectionRef}
        className="bg-gradient-to-br from-blue to-navy px-4 pb-10"
        style={{ borderRadius: '0 0 100% 100% / 0 0 40px 40px' }}
      >
        {/* White XP card */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <p className="text-slate-400 text-xs font-medium mb-3">Current DEVCON Points</p>
          <div className="flex items-end gap-2 mb-3">
            <Star className="w-8 h-8 text-gold fill-gold shrink-0 mb-0.5" />
            <span className="text-4xl font-black text-slate-900 leading-none">{totalPoints.toLocaleString()}</span>
            <span className="text-slate-400 font-semibold text-base mb-0.5">pts</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-slate-400 text-xs mb-4">
            {Math.max(MOCK_PROFILE_XP_NEXT_MILESTONE - totalPoints, 0).toLocaleString()} pts to next reward tier
          </p>
          <button
            onClick={() => navigate('/events')}
            className="w-full bg-blue text-white font-bold py-3.5 rounded-2xl text-sm"
          >
            Attend Our Events
          </button>
        </div>
      </div>

      {/* ── Scrollable feed ── */}
      <div className="bg-slate-50 space-y-6 pb-8">

        {/* Quick Actions */}
        <section className="pt-5 px-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Briefcase, label: 'Find Jobs',  onClick: () => navigate('/jobs') },
              { icon: Heart,     label: 'Volunteer',  onClick: () => setShowVolunteerModal(true) },
              { icon: Gift,      label: 'Redeem',     onClick: () => navigate('/rewards') },
            ].map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-card"
              >
                <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Rotating banner */}
        <div className="px-4">
          <div
            className={`relative h-44 rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br ${banner.gradient}`}
            onClick={() => setBannerIdx((i) => (i + 1) % BANNERS.length)}
          >
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <div>
                <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest mb-1">{banner.sub}</p>
                <p className="text-white text-2xl font-black leading-tight max-w-[70%]">{banner.title}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleBannerCta() }}
                className="self-start bg-blue text-white text-xs font-bold px-4 py-2 rounded-full shadow"
              >
                {banner.cta}
              </button>
            </div>
          </div>
          <div className="flex justify-center gap-1.5 mt-2.5">
            {BANNERS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${i === bannerIdx ? 'w-4 h-1.5 bg-navy' : 'w-1.5 h-1.5 bg-slate-300'}`}
              />
            ))}
          </div>
        </div>

        {/* Events For You */}
        <section>
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">Events For You</h2>
            <button
              onClick={() => navigate('/events')}
              className="text-xs text-blue font-semibold flex items-center gap-0.5"
            >
              See All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="px-4 space-y-3">
            {forYouEvents.map((e) => <EventCard key={e.id} event={e} compact />)}
          </div>
        </section>

        {/* Hot Jobs — horizontal scroll carousel */}
        <section>
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              Hot Jobs <Flame className="w-4 h-4 text-orange-500" />
            </h2>
            <button
              onClick={() => navigate('/jobs')}
              className="text-xs text-blue font-semibold flex items-center gap-0.5"
            >
              See All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto px-4 pb-1">
            <div className="flex gap-3">
              {hotJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="flex-shrink-0 w-52 bg-white rounded-2xl border border-slate-200 shadow-card p-4 text-left relative"
                >
                  {job.is_promoted && (
                    <div className="absolute top-3 right-3">
                      <PromotedBadge />
                    </div>
                  )}
                  <div className="w-9 h-9 rounded-xl bg-blue/10 flex items-center justify-center text-sm font-bold text-blue mb-2">
                    {job.company.charAt(0)}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{job.company}</p>
                  <p className="font-semibold text-slate-900 text-sm leading-tight mt-0.5 pr-6 line-clamp-2">
                    {job.title}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400 truncate">{job.location}</span>
                  </div>
                  <span className="inline-block mt-2 text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Updates — tabbed DEVCON / Tech Community */}
        <section>
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">Updates</h2>
            <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
              {(['devcon', 'community'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewsTab(t)}
                  className={`text-xs font-semibold px-3 py-1.5 transition-colors ${
                    newsTab === t ? 'bg-navy text-white' : 'text-slate-500'
                  }`}
                >
                  {t === 'devcon' ? 'DEVCON' : 'Tech'}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 space-y-3">
            {visibleNews.map((p) => <NewsCard key={p.id} post={p} />)}
          </div>
        </section>

        {/* XP History preview */}
        <section>
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">XP History</h2>
            <button
              onClick={() => navigate('/points/history')}
              className="text-xs text-blue font-semibold flex items-center gap-0.5"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mx-4 bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            {recentTxns.map((tx, i) => (
              <div
                key={tx.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < recentTxns.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    tx.amount > 0 ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                  }`}
                >
                  {tx.amount > 0 ? '+' : '−'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{tx.description}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(tx.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green' : 'text-red'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} pts
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showVolunteerModal && (
        <ComingSoonModal feature="Volunteering" onClose={() => setShowVolunteerModal(false)} />
      )}
    </div>
  )
}
