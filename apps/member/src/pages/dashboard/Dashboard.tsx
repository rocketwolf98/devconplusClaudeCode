import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaseOutline, HeartOutline, GiftOutline, AltArrowRightOutline, FireOutline, BellOutline, CalendarMarkOutline } from 'solar-icon-set'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import { useJobsStore } from '../../stores/useJobsStore'
import { usePointsStore } from '../../stores/usePointsStore'
import { useNotificationsStore } from '../../stores/useNotificationsStore'
import { supabase } from '../../lib/supabase'
import EventCard from '../../components/EventCard'
import XPCard from '../../components/XPCard'
import {
  SkeletonEventCard,
  SkeletonXPRow,
} from '../../components/Skeleton'
import { staggerContainer, cardItem, fadeUp } from '../../lib/animation'

import { formatDate, isEventArchived } from '../../lib/dates'
import logoMark from '../../assets/logos/logo-mark.svg'

const WELCOME_BANNER = {
  title: 'Welcome to DEVCON+',
  sub:   'DEVCON Philippines · Your Tech Community',
  cta:   'Learn More',
  image: '/photos/devcon-summit-group.jpg',
} as const


export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { events, fetchEvents, isLoading: eventsLoading } = useEventsStore()
  const { jobs, isLoading: jobsLoading, fetchJobs } = useJobsStore()
  const { transactions, loadTotalPoints, loadTransactions, isLoading: pointsLoading } = usePointsStore()
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  // IDs of all chapters in the user's region (including their own). Used to filter nearby events.
  const [regionChapterIds, setRegionChapterIds] = useState<Set<string>>(new Set())
  const [bannerIdx, setBannerIdx] = useState(0)
  const [jobBannerIdx, setJobBannerIdx] = useState(0)

  const bannersLengthRef = useRef(1)
  const jobsLengthRef    = useRef(0)

  const scrollYMV      = useMotionValue(0)
  const cradleOpacity  = useTransform(scrollYMV, [0,  110], [1, 0])
  const cradleHeight   = useTransform(scrollYMV, [60, 180], [280, 0])
  const gradientOpacity = useTransform(scrollYMV, [30, 140], [0, 1])

  const headerPaddingTop    = useTransform(scrollYMV, [0, 80], [56, 16])
  const headerPaddingBottom = useTransform(scrollYMV, [0, 80], [16, 8])
  const greetingFontSize    = useTransform(scrollYMV, [0, 80], [30, 18])
  const logoHeight          = useTransform(scrollYMV, [0, 80], [32, 22])
  const bellSize            = useTransform(scrollYMV, [0, 80], [36, 28])

  useEffect(() => {
    void fetchEvents()
    void fetchJobs()
    void loadTotalPoints()
    void loadTransactions()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve the user's region and sibling chapter IDs for "Events near you" filtering.
  useEffect(() => {
    const chapterId = user?.chapter_id
    if (!chapterId) return

    void (async () => {
      // Fetch the user's own chapter to get their region
      const { data: ownChapter } = await supabase
        .from('chapters')
        .select('region')
        .eq('id', chapterId)
        .single()
      if (!ownChapter?.region) return

      // Then fetch all chapters in the same region
      const { data: siblings } = await supabase
        .from('chapters')
        .select('id')
        .eq('region', ownChapter.region)
      if (siblings) {
        setRegionChapterIds(new Set(siblings.map((c) => c.id)))
      }
    })()
  }, [user?.chapter_id])

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % Math.max(bannersLengthRef.current, 1)), 4000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      if (jobsLengthRef.current > 1) {
        setJobBannerIdx(i => (i + 1) % jobsLengthRef.current)
      }
    }, 4000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const el = document.querySelector('[data-scroll-container]') as HTMLElement
    if (!el) return
    const handler = () => scrollYMV.set(el.scrollTop)
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [scrollYMV])

  // Build carousel: welcome article + up to 2 nearest upcoming events (max 3 total)
  const upcomingByDate = events
    .filter((e) => e.status === 'upcoming' && !isEventArchived(e))
    .sort((a, b) => new Date(a.event_date ?? 0).getTime() - new Date(b.event_date ?? 0).getTime())

  const banners = [
    { ...WELCOME_BANNER, onClick: () => navigate('/news/welcome') },
    ...upcomingByDate.slice(0, 2).map((e) => ({
      title: e.title,
      sub:   e.location ?? 'DEVCON Philippines',
      cta:   'Register Now',
      image: e.cover_image_url ?? '/photos/devcon-certificate-ceremony.jpg',
      onClick: () => navigate(`/events/${e.slug}`),
    })),
  ].slice(0, 3)

  bannersLengthRef.current = banners.length
  const safeIdx = bannerIdx % Math.max(banners.length, 1)
  const banner = banners[safeIdx] ?? banners[0]
  const firstName = user?.full_name?.split(' ')[0] ?? 'Member'
  const userChapterId = user?.chapter_id ?? null
  const nearbyEvents = events
    .filter((e) => {
      if (e.status !== 'upcoming' || isEventArchived(e)) return false
      // Chapter-locked events are only visible to members of that chapter
      if (e.is_chapter_locked && e.chapter_id !== userChapterId) return false
      // Show events from the user's region (or all events if region hasn't loaded yet)
      if (regionChapterIds.size > 0 && e.chapter_id && !regionChapterIds.has(e.chapter_id)) return false
      return true
    })
    .sort((a, b) => {
      // Own chapter floats to the top; within each group sort by date
      const aOwn = a.chapter_id === userChapterId ? 0 : 1
      const bOwn = b.chapter_id === userChapterId ? 0 : 1
      if (aOwn !== bOwn) return aOwn - bOwn
      return new Date(a.event_date ?? 0).getTime() - new Date(b.event_date ?? 0).getTime()
    })
    .slice(0, 3)
  const promotedJobs = jobs
    .filter(j => j.is_promoted)
    .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())
    .slice(0, 5)
  jobsLengthRef.current = promotedJobs.length
  const safeJobIdx = jobBannerIdx % Math.max(promotedJobs.length, 1)
  const currentJob = promotedJobs[safeJobIdx]
  const recentTxns = transactions.slice(0, 4)

  return (
    <div>
      {/* ── Sticky greeting bar + gradient tail ── */}
      <div className="sticky top-0 z-40 relative">
        <motion.div className="bg-primary px-6" style={{ paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom }}>
          <div className="flex items-center justify-between">
            {/* Logomark + greeting */}
            <div className="flex items-center gap-2.5">
              <motion.img src={logoMark} alt="DEVCON+" className="w-auto" style={{ height: logoHeight }} />
              <motion.h1
                className="text-white font-black"
                style={{ fontSize: greetingFontSize, lineHeight: 1.1 }}
              >
                Hi, {firstName}!
              </motion.h1>
            </div>
            {/* Notification bell */}
            <motion.button
              onClick={() => navigate('/notifications')}
              className="relative bg-white/20 rounded-full flex items-center justify-center active:bg-white/30 transition-colors"
              style={{ width: bellSize, height: bellSize }}
            >
              <BellOutline className="w-[18px] h-[18px] text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4
                                 bg-red text-white text-[9px] font-bold rounded-full
                                 flex items-center justify-center px-1 leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>
        {/* Gradient: absolutely positioned — no layout impact, overlaps cradle top */}
        <motion.div
          className="absolute left-0 right-0 h-10 pointer-events-none"
          style={{
            top: '100%',
            background: 'linear-gradient(to bottom, rgb(var(--color-primary)), transparent)',
            opacity: gradientOpacity,
          }}
        />
      </div>

      {/* ── Blue cradle — fades and collapses on scroll ── */}
      <motion.div
        className="bg-primary px-4 pb-10 overflow-hidden"
        style={{ borderRadius: '0 0 100% 100% / 0 0 40px 40px', opacity: cradleOpacity, maxHeight: cradleHeight }}
      >
        <XPCard />
      </motion.div>

      {/* ── Scrollable feed ── */}
      <div className="bg-slate-50 pb-8">
      <div className="space-y-6 md:max-w-4xl md:mx-auto">

        {/* Quick Actions */}
        <motion.section
          className="pt-5 px-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: CaseOutline, label: 'Find Jobs',  onClick: () => navigate('/jobs') },
              { icon: HeartOutline,     label: 'Volunteer',  onClick: () => navigate('/events') },
              { icon: GiftOutline,      label: 'Redeem',     onClick: () => navigate('/rewards') },
            ].map(({ icon: Icon, label, onClick }) => (
              <motion.button
                key={label}
                variants={cardItem}
                onClick={onClick}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-card"
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Rotating banner — crossfade between slides */}
        <div className="px-4">
          <div
            className="relative h-52 rounded-2xl overflow-hidden cursor-pointer bg-primary"
            onClick={() => setBannerIdx((i) => (i + 1) % Math.max(banners.length, 1))}
          >
            <AnimatePresence>
              <motion.img
                key={`img-${safeIdx}`}
                src={banners[safeIdx]?.image ?? ''}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-black/50" />
            <AnimatePresence mode="wait">
              <motion.div
                key={safeIdx}
                className="absolute inset-0 flex flex-col justify-between p-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div>
                  <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest mb-1">{banner.sub}</p>
                  <p className="text-white text-xl font-semibold leading-tight max-w-[70%] line-clamp-2">{banner.title}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); banner?.onClick() }}
                  className="self-start bg-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow"
                >
                  {banner.cta}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-1.5 mt-2.5">
            {banners.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width:           i === safeIdx ? 16 : 6,
                  backgroundColor: i === safeIdx ? '#1E2A56' : '#CBD5E1',
                }}
                transition={{ duration: 0.25 }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
        </div>

        {/* Events For You */}
        <section>
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">Events Near You</h2>
            <button
              onClick={() => navigate('/events')}
              className="text-xs text-primary font-semibold flex items-center gap-0.5"
            >
              See All <AltArrowRightOutline className="w-3 h-3" />
            </button>
          </div>
          {eventsLoading ? (
            <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <SkeletonEventCard key={i} />)}
            </div>
          ) : nearbyEvents.length === 0 ? (
            <motion.div
              className="mx-4 flex flex-col items-center gap-3 py-8 px-6 rounded-2xl bg-white border border-slate-200 shadow-card text-center"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CalendarMarkOutline className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Events coming soon</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Your chapter is planning something. CheckCircleOutline back soon or browse all events.
                </p>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-semibold text-primary"
              >
                Browse all events
              </button>
            </motion.div>
          ) : (
            <motion.div
              className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {nearbyEvents.map((e) => (
                <motion.div key={e.id} variants={cardItem}>
                  <EventCard event={e} compact />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Hot Jobs — auto-rotating crossfade banner, swipeable */}
        {(jobsLoading || promotedJobs.length > 0) && (
          <section>
            <div className="flex justify-between items-center px-4 mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                Hot Jobs <FireOutline className="w-4 h-4 text-orange-500" />
              </h2>
              <button
                onClick={() => navigate('/jobs')}
                className="text-xs text-primary font-semibold flex items-center gap-0.5"
              >
                See All <AltArrowRightOutline className="w-3 h-3" />
              </button>
            </div>

            {jobsLoading ? (
              <div className="mx-4 h-44 rounded-2xl animate-pulse bg-slate-200" />
            ) : (
              <div className="px-4">
                <motion.div
                  className="relative h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-navy to-slate-900 cursor-pointer select-none"
                  onPanEnd={(_, info) => {
                    if (info.offset.x < -50) {
                      setJobBannerIdx(i => (i + 1) % Math.max(promotedJobs.length, 1))
                    } else if (info.offset.x > 50) {
                      setJobBannerIdx(i => (i - 1 + Math.max(promotedJobs.length, 1)) % Math.max(promotedJobs.length, 1))
                    }
                  }}
                >
                  <AnimatePresence mode="wait">
                    {currentJob && (
                      <motion.div
                        key={safeJobIdx}
                        className="absolute inset-0 flex flex-col justify-between p-5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        <div>
                          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-1.5">
                            {currentJob.company}{currentJob.location ? ` · ${currentJob.location}` : ''}
                          </p>
                          <p className="text-white text-xl font-bold leading-snug line-clamp-2 max-w-[85%]">
                            {currentJob.title}
                          </p>
                        </div>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/jobs?id=${currentJob.id}`)
                          }}
                          className="self-start bg-blue text-white text-xs font-bold px-4 py-2 rounded-full shadow"
                          whileTap={{ scale: 0.95 }}
                        >
                          Apply Now
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <div className="flex justify-center gap-1.5 mt-2.5">
                  {promotedJobs.map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        width:           i === safeJobIdx ? 16 : 6,
                        backgroundColor: i === safeJobIdx ? '#1E2A56' : '#CBD5E1',
                      }}
                      transition={{ duration: 0.25 }}
                      className="h-1.5 rounded-full"
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Updates — welcome card */}
        <section>
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">Updates</h2>
          </div>
          <motion.button
            onClick={() => navigate('/news/welcome')}
            className="mx-4 w-[calc(100%-2rem)] bg-white rounded-2xl shadow-card overflow-hidden text-left"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            whileTap={{ scale: 0.98 }}
          >
            <img
              src="/photos/devcon-summit-group.jpg"
              alt="DEVCON Summit"
              className="w-full h-36 object-cover"
            />
            <div className="p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">DEVCON Philippines</p>
              <p className="font-bold text-slate-900 text-sm leading-snug mb-2">
                Welcome to DEVCON+ — Your Tech Community Hub
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Register for chapter events, earn Points+ for every activity, browse exclusive opportunities, and redeem rewards — all in one place. More updates coming soon!
              </p>
            </div>
          </motion.button>
        </section>

        {/* XP History preview */}
        <section>
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900">XP History</h2>
            <button
              onClick={() => navigate('/points/history')}
              className="text-xs text-primary font-semibold flex items-center gap-0.5"
            >
              View All <AltArrowRightOutline className="w-3 h-3" />
            </button>
          </div>
          <div className="mx-4 bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            {pointsLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonXPRow key={i} border={i < 4} />
                ))}
              </>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {recentTxns.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    variants={fadeUp}
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
                        {formatDate.compact(tx.created_at)}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green' : 'text-red'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} pts
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      </div>
      </div>

    </div>
  )
}
