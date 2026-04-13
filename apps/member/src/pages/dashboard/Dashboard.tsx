import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AltArrowRightOutline, CalendarMarkOutline, MapPointOutline, CheckSquareOutline, StarOutline } from 'solar-icon-set'
import { motion, AnimatePresence, useMotionValue } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import { useJobsStore } from '../../stores/useJobsStore'
import { usePointsStore } from '../../stores/usePointsStore'
import { useMissionsStore } from '../../stores/useMissionsStore'
import { supabase } from '../../lib/supabase'
import EventCard from '../../components/EventCard'
import VolunteerXpCard from '../../components/VolunteerXpCard'
import {
  SkeletonEventCard,
  SkeletonXPRow,
} from '../../components/Skeleton'
import { staggerContainer, cardItem, fadeUp } from '../../lib/animation'
import { WORK_TYPE_LABELS } from '../../lib/constants'
import { formatDate, isEventArchived } from '../../lib/dates'

const WELCOME_BANNER = {
  title: 'Welcome to DEVCON+',
  sub:   'DEVCON Philippines · Your Tech Community',
  cta:   'Learn More',
  image: '/photos/devcon-summit-group.jpg',
} as const

// High-fidelity image assets for Quick Actions from Figma
const imgJobsIcon = "https://www.figma.com/api/mcp/asset/7b48b817-a2d2-4482-85fe-66f2e3b75e47";
const imgVolunteerIcon = "https://www.figma.com/api/mcp/asset/ab164d19-c141-42dd-b45e-3e1c9fd495aa";
const imgRedeemIcon = "https://www.figma.com/api/mcp/asset/ea2da9dc-90d7-4b9c-b2bc-34d722113aa0";

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { events, fetchEvents, isLoading: eventsLoading } = useEventsStore()
  const { jobs, isLoading: jobsLoading, fetchJobs } = useJobsStore()
  const { transactions, loadTotalPoints, loadTransactions, isLoading: pointsLoading } = usePointsStore()
  const { missions, participants, submissions, fetchAll: fetchMissions } = useMissionsStore()
  const [regionChapterIds, setRegionChapterIds] = useState<Set<string>>(new Set())
  const [bannerIdx, setBannerIdx] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({})
  const [attendeeDetails, setAttendeeDetails] = useState<Record<string, { avatar_url: string | null; full_name: string }[]>>({})
  const [activeTab, setActiveTab] = useState<'updates' | 'featured'>('updates')

  const bannersLengthRef = useRef(1)

  const scrollYMV      = useMotionValue(0)

  useEffect(() => {
    void fetchEvents()
    void fetchJobs()
    void loadTotalPoints()
    void loadTransactions()
    void fetchMissions()

    // Fetch approved registration counts and some profiles for all events
    supabase
      .from('event_registrations')
      .select('event_id, profiles(avatar_url, full_name)')
      .eq('status', 'approved')
      .order('registered_at', { ascending: false })
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        const details: Record<string, { avatar_url: string | null; full_name: string }[]> = {}

        data?.forEach((row) => {
          if (row.event_id == null) return
          counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
          
          if (!details[row.event_id]) details[row.event_id] = []
          if (row.profiles && details[row.event_id].length < 1) {
            const p = row.profiles as unknown as { avatar_url: string | null; full_name: string }
            details[row.event_id].push(p)
          }
        })

        setAttendeeCounts(counts)
        setAttendeeDetails(details)
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const chapterId = user?.chapter_id
    if (!chapterId) return

    void (async () => {
      const { data: ownChapter } = await supabase
        .from('chapters')
        .select('region')
        .eq('id', chapterId)
        .single()
      if (!ownChapter?.region) return

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
    const el = document.querySelector('[data-scroll-container]') as HTMLElement
    if (!el) return
    const handler = () => {
      scrollYMV.set(el.scrollTop)
      setIsScrolled(el.scrollTop > 50)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [scrollYMV])

  const upcomingByDate = events
    .filter((e) => e.status === 'upcoming' && !isEventArchived(e))
    .sort((a, b) => new Date(a.event_date ?? 0).getTime() - new Date(b.event_date ?? 0).getTime())

  const banners = [
    { ...WELCOME_BANNER, onClick: () => navigate('/news/welcome') },
    ...upcomingByDate.slice(0, 2).map((e) => ({
      title: e.title,
      sub:   e.location ?? 'DEVCON Philippines',
      date:  e.event_date ? formatDate.compact(e.event_date) : undefined,
      cta:   'Register Now',
      image: e.cover_image_url ?? '/photos/devcon-certificate-ceremony.jpg',
      onClick: () => navigate(`/events/${e.slug}`),
    })),
  ].slice(0, 3)

  bannersLengthRef.current = banners.length
  const safeIdx = bannerIdx % Math.max(banners.length, 1)
  const banner = banners[safeIdx] ?? banners[0]
  const userChapterId = user?.chapter_id ?? null
  const nearbyEvents = events
    .filter((e) => {
      if (e.status !== 'upcoming' || isEventArchived(e)) return false
      if (e.is_chapter_locked && e.chapter_id !== userChapterId) return false
      if (regionChapterIds.size > 0 && e.chapter_id && !regionChapterIds.has(e.chapter_id)) return false
      return true
    })
    .sort((a, b) => {
      const aOwn = a.chapter_id === userChapterId ? 0 : 1
      const bOwn = b.chapter_id === userChapterId ? 0 : 1
      if (aOwn !== bOwn) return aOwn - bOwn
      return new Date(a.event_date ?? 0).getTime() - new Date(b.event_date ?? 0).getTime()
    })
    .slice(0, 3)
  const recentTxns = transactions.slice(0, 4)

  const featuredEvent = events.find((e) => e.is_featured) ?? upcomingByDate[0]

  return (
    <div className="relative min-h-screen bg-slate-50">
      <VolunteerXpCard />

      {/* ── Main Content Area ── */}
      <motion.main 
        className="relative z-10 flex flex-col gap-6 p-4 md:max-w-4xl md:mx-auto"
        initial={false}
        animate={{
          paddingTop: isScrolled ? 80 : 16 // pt-20 when scrolled for clearance, pt-4 when unscrolled for tight gap
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        
        {/* Quick Actions Wrapper for Scroll Collapse */}
        <motion.div
          animate={{
            maxHeight: isScrolled ? 0 : 200,
            opacity: isScrolled ? 0 : 1,
            marginBottom: isScrolled ? 0 : 0
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <motion.section
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <div className="grid grid-cols-3 gap-3">
              {/* Find Jobs Card */}
              <motion.button
                variants={cardItem}
                onClick={() => navigate('/jobs')}
                className="bg-[rgba(127,8,255,0.15)] border border-[rgba(127,8,255,0.1)] flex flex-col gap-2 items-center justify-center rounded-[16px] shadow-[0px_0px_8px_0px_rgba(27,0,56,0.1)] w-full py-4"
                whileTap={{ scale: 0.95 }}
              >
                <div className="bg-white flex items-center justify-center rounded-full w-[42px] h-[42px] shadow-sm">
                  <img src={imgJobsIcon} alt="" className="w-6 h-6" />
                </div>
                <span className="font-proxima font-semibold text-[#0d121b] text-[10px]">Find Jobs</span>
              </motion.button>

              {/* Volunteer Card */}
              <motion.button
                variants={cardItem}
                onClick={() => navigate('/events')}
                className="bg-[rgba(115,178,9,0.15)] border border-[rgba(70,144,17,0.1)] flex flex-col gap-2 items-center justify-center rounded-[16px] shadow-[0px_0px_8px_0px_rgba(25,39,0,0.1)] w-full py-4"
                whileTap={{ scale: 0.95 }}
              >
                <div className="bg-white flex items-center justify-center rounded-full w-[42px] h-[42px] shadow-sm">
                  <img src={imgVolunteerIcon} alt="" className="size-6" />
                </div>
                <span className="font-proxima font-semibold text-[#0d121b] text-[10px]">Volunteer</span>
              </motion.button>

              {/* Redeem Card */}
              <motion.button
                variants={cardItem}
                onClick={() => navigate('/rewards')}
                className="bg-[rgba(234,179,8,0.15)] border border-[rgba(210,173,25,0.1)] flex flex-col gap-2 items-center justify-center rounded-[16px] shadow-[0px_0px_8px_0px_rgba(75,60,0,0.1)] w-full py-4"
                whileTap={{ scale: 0.95 }}
              >
                <div className="bg-white flex items-center justify-center rounded-full w-[42px] h-[42px] shadow-sm">
                  <img src={imgRedeemIcon} alt="" className="size-6" />
                </div>
                <span className="font-proxima font-semibold text-[#0d121b] text-[10px]">Redeem</span>
              </motion.button>
            </div>
          </motion.section>
        </motion.div>

        {/* Rotating banner */}
        <div>
          <div
            className="relative h-[300px] rounded-2xl overflow-hidden cursor-pointer bg-primary"
            onClick={() => setBannerIdx((i) => (i + 1) % Math.max(banners.length, 1))}
          >
            <AnimatePresence mode="wait">
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
                className="absolute inset-0 flex flex-col p-[20px] pt-[24px] pb-[18px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex flex-col flex-1 gap-1 items-start w-full">
                  <p className="font-proxima font-bold text-2xl text-white leading-normal line-clamp-2 w-full">
                    {banner.title}
                  </p>
                  
                  <div className="flex flex-1 items-start w-full">
                    <div className="flex gap-1 items-center flex-wrap">
                      {'date' in banner && banner.date && (
                        <>
                          <p className="font-proxima text-[#dfdfdf] text-xs tracking-[0.48px] uppercase">
                            {banner.date}
                          </p>
                          <div className="w-1 h-1 bg-[#dfdfdf] rounded-full shrink-0" />
                        </>
                      )}
                      <p className="font-proxima text-[#dfdfdf] text-xs tracking-[0.48px] uppercase line-clamp-1">
                        {banner.sub}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); banner?.onClick() }}
                    className="bg-[#1152d4] text-white text-xs font-semibold px-[18px] py-[12px] rounded-full flex items-center justify-center shrink-0 leading-none shadow-sm"
                  >
                    {banner.cta}
                  </button>
                </div>
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
          <div className="flex items-center justify-between mb-3">
            <p className="font-proxima font-bold text-[18px] text-black">
              Events Near You
            </p>
            <button 
              onClick={() => navigate('/events')}
              className="flex gap-1 items-center"
            >
              <p className="font-proxima text-[#464646] text-[12px] tracking-[0.96px] uppercase">
                MORE
              </p>
              <AltArrowRightOutline className="w-3 h-3 text-[#464646]" />
            </button>
          </div>
          {eventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <SkeletonEventCard key={i} />)}
            </div>
          ) : nearbyEvents.length === 0 ? (
            <motion.div
              className="flex flex-col items-center gap-3 py-8 px-6 rounded-2xl bg-white border border-slate-200 shadow-card text-center"
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
                  Your chapter is planning something. Check back soon or browse all events.
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {nearbyEvents.map((e) => (
                <motion.div key={e.id} variants={cardItem}>
                  <EventCard 
                    event={e} 
                    compact 
                    attendeeCount={attendeeCounts[e.id]} 
                    attendees={attendeeDetails[e.id]} 
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Hot Jobs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="font-proxima font-bold text-[18px] text-black">Hot Jobs</p>
            <button onClick={() => navigate('/jobs')} className="flex gap-1 items-center">
              <p className="font-proxima text-[#464646] text-[12px] tracking-[0.96px] uppercase">MORE</p>
              <AltArrowRightOutline className="w-3 h-3 text-[#464646]" />
            </button>
          </div>

          {jobsLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-[148px] rounded-2xl animate-pulse bg-slate-200" />
              ))}
            </div>
          ) : (
            <motion.div
              className="flex flex-col gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {jobs.filter(j => j.is_active).slice(0, 3).map((job) => (
                <motion.button
                  key={job.id}
                  variants={cardItem}
                  onClick={() => navigate(`/jobs?id=${job.id}`)}
                  className="w-full bg-white border border-[rgba(156,163,175,0.3)] rounded-[24px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.1)] text-left"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="px-[18px] py-4 flex flex-col gap-2">
                    {/* Top: Promoted badge or spacer */}
                    <div className="flex items-center min-h-[25px]">
                      {job.is_promoted && (
                        <span className="bg-[rgba(255,111,11,0.2)] text-[#ff6f0b] text-[9px] font-semibold tracking-[0.9px] uppercase px-2 py-0.5 rounded-full">
                          PROMOTED
                        </span>
                      )}
                    </div>

                    {/* Middle: Title + company + location + work type */}
                    <div className="flex flex-col items-start gap-0.5">
                      <p className="font-proxima font-bold text-[16px] text-black leading-snug w-full">
                        {job.title}
                      </p>
                      <p className="font-proxima text-[#6b7280] text-[12px] py-1">
                        Posted by {job.company}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <MapPointOutline className="w-[10px] h-[10px] text-[#6b7280]" />
                            <span className="font-proxima text-[#6b7280] text-[12px]">{job.location}</span>
                          </div>
                        )}
                        {job.work_type && (
                          <span className="bg-[rgba(102,102,102,0.2)] text-[#6b7280] text-[9px] font-semibold px-2 py-0.5 rounded-full">
                            {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Action button */}
                    <div className="pt-1">
                      <span className="bg-[#1152d4] text-white text-[12px] font-semibold px-[18px] py-[10px] rounded-full inline-block leading-none">
                        Learn More
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </section>

        {/* Missions */}
        {missions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="font-proxima font-bold text-[18px] text-black">Missions</p>
              <button onClick={() => navigate('/jobs?tab=missions')} className="flex gap-1 items-center">
                <p className="font-proxima text-[#464646] text-[12px] tracking-[0.96px] uppercase">MORE</p>
                <AltArrowRightOutline className="w-3 h-3 text-[#464646]" />
              </button>
            </div>

            <motion.div className="flex flex-col gap-3" variants={staggerContainer} initial="hidden" animate="visible">
              {missions.slice(0, 2).map((mission) => {
                const submissionCount = submissions.filter(s => s.mission_id === mission.id).length
                const participantCount = participants.filter(p => p.mission_id === mission.id).length
                const isClaimed = mission.status === 'claimed'

                const difficultyStyle: Record<string, { bg: string; text: string }> = {
                  easy:   { bg: 'rgba(115,178,9,0.2)',   text: '#4a8c05' },
                  medium: { bg: 'rgba(255,111,11,0.2)',  text: '#ff6f0b' },
                  hard:   { bg: 'rgba(127,8,255,0.2)',   text: '#7f08ff' },
                }
                const diff = difficultyStyle[mission.difficulty ?? 'easy']

                return (
                  <motion.button
                    key={mission.id}
                    variants={cardItem}
                    onClick={() => navigate('/jobs?tab=missions')}
                    className="w-full bg-white border border-[rgba(156,163,175,0.3)] rounded-[24px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.1)] text-left"
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="px-[18px] py-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] font-semibold tracking-[0.9px] uppercase px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: diff.bg, color: diff.text }}
                        >
                          {mission.difficulty?.toUpperCase() ?? 'EASY'}
                        </span>
                        <span className="bg-[rgba(254,248,209,0.9)] text-[#d2ad19] text-[9px] font-semibold tracking-[0.9px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <StarOutline className="w-[6px] h-[6px] text-[#d2ad19]" />
                          {mission.xp_reward} EXP
                        </span>
                      </div>
                      <div className="flex flex-col items-start">
                        <p className="font-proxima font-bold text-[16px] text-black w-full leading-snug">{mission.title}</p>
                        <div className="flex items-center gap-3 py-1">
                          {submissionCount > 0 && (
                            <div className="flex items-center gap-1">
                              <CheckSquareOutline className="w-[10px] h-[10px] text-[#6b7280]" />
                              <span className="font-proxima text-[#6b7280] text-[12px]">{submissionCount} Submitted</span>
                            </div>
                          )}
                          {participantCount > 0 && (
                            <span className="font-proxima text-[#6b7280] text-[12px]">{participantCount} joined</span>
                          )}
                        </div>
                      </div>
                      <div className="pt-1">
                        <span
                          className="text-white text-[12px] font-semibold px-[18px] py-[10px] rounded-full inline-block leading-none"
                          style={{ backgroundColor: isClaimed ? '#868686' : '#1152d4' }}
                        >
                          {isClaimed ? 'Claimed' : 'Start Mission'}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          </section>
        )}

        {/* Switcher: Updates / Featured */}
        <section className="flex flex-col gap-4">
          <div className="border border-[rgba(156,163,175,0.3)] flex gap-[10px] items-center justify-center p-[8px] rounded-[100px] w-full">
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex-1 flex items-center justify-center p-[12px] rounded-[24px] transition-all duration-300 ${
                activeTab === 'updates' ? 'bg-[#1152d4] text-white' : 'text-black active:bg-slate-100'
              }`}
            >
              <p className="font-proxima font-bold text-[18px]">
                Updates
              </p>
            </button>
            <button
              onClick={() => setActiveTab('featured')}
              className={`flex-1 flex items-center justify-center p-[12px] rounded-[24px] transition-all duration-300 ${
                activeTab === 'featured' ? 'bg-[#1152d4] text-white' : 'text-black active:bg-slate-100'
              }`}
            >
              <p className="font-proxima font-bold text-[18px]">
                Featured
              </p>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'updates' ? (
              <motion.button
                key="updates"
                onClick={() => navigate('/news/welcome')}
                className="w-full bg-white rounded-2xl shadow-card overflow-hidden text-left"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
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
            ) : (
              <motion.div
                key="featured"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {featuredEvent && (
                  <EventCard 
                    event={featuredEvent} 
                    attendeeCount={attendeeCounts[featuredEvent.id]} 
                    attendees={attendeeDetails[featuredEvent.id]} 
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Points History */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="font-proxima font-bold text-[18px] text-black">
              Points History
            </p>
            <button 
              onClick={() => navigate('/points/history')}
              className="flex gap-1 items-center"
            >
              <p className="font-proxima text-[#464646] text-[12px] tracking-[0.96px] uppercase">
                MORE
              </p>
              <AltArrowRightOutline className="w-3 h-3 text-[#464646]" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
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
      </motion.main>
    </div>
  )
}
