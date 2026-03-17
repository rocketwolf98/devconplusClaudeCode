import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Heart, Gift, ChevronRight, Flame, Star, Bell } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import { usePointsStore } from '../../stores/usePointsStore'
import { useNotificationsStore } from '../../stores/useNotificationsStore'
import EventCard from '../../components/EventCard'
import ComingSoonModal from '../../components/ComingSoonModal'
import {
  SkeletonEventCard,
  SkeletonXPRow,
} from '../../components/Skeleton'
import { staggerContainer, cardItem, fadeUp } from '../../lib/animation'

import { formatDate, isEventArchived } from '../../lib/dates'
import logoMark from '../../assets/logos/logo-mark.svg'

const XP_NEXT_MILESTONE = 2500

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
  const { transactions, totalPoints, fetchPoints, isLoading: pointsLoading } = usePointsStore()
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const [bannerIdx, setBannerIdx] = useState(0)
  const [showVolunteerModal, setShowVolunteerModal] = useState(false)
  const [showJobsModal, setShowJobsModal] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)

  const bannersLengthRef = useRef(1)

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
    if (user?.id) void fetchPoints(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % Math.max(bannersLengthRef.current, 1)), 4000)
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
      onClick: () => navigate(`/events/${e.id}`),
    })),
  ].slice(0, 3)

  bannersLengthRef.current = banners.length
  const safeIdx = bannerIdx % Math.max(banners.length, 1)
  const banner = banners[safeIdx] ?? banners[0]
  const firstName = user?.full_name?.split(' ')[0] ?? 'Member'
  const progressPct = Math.min((totalPoints / XP_NEXT_MILESTONE) * 100, 100)
  const forYouEvents = events.filter((e) => e.status === 'upcoming' && !isEventArchived(e)).slice(0, 3)
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
              <Bell className="w-[18px] h-[18px] text-white" />
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
        <div className="bg-white rounded-3xl shadow-xl p-5">
          <p className="text-slate-400 text-xs font-medium mb-3">Current DEVCON Points</p>
          <div className="flex items-end gap-2 mb-3">
            <Star className="w-8 h-8 text-gold fill-gold shrink-0 mb-0.5" />
            <span className="text-4xl font-black text-slate-900 leading-none">{totalPoints.toLocaleString()}</span>
            <span className="text-slate-400 font-semibold text-base mb-0.5">pts</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
            <motion.div
              className="h-full bg-gold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
            />
          </div>
          <p className="text-slate-400 text-xs mb-4">
            {Math.max(XP_NEXT_MILESTONE - totalPoints, 0).toLocaleString()} pts to next reward tier
          </p>
          <button
            onClick={() => navigate('/events')}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl text-sm"
          >
            Attend Our Events
          </button>
        </div>
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
              { icon: Briefcase, label: 'Find Jobs',  onClick: () => setShowJobsModal(true) },
              { icon: Heart,     label: 'Volunteer',  onClick: () => setShowVolunteerModal(true) },
              { icon: Gift,      label: 'Redeem',     onClick: () => setShowRedeemModal(true) },
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
            className="relative h-44 rounded-2xl overflow-hidden cursor-pointer bg-primary"
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
                  <p className="text-white text-2xl font-black leading-tight max-w-[70%]">{banner.title}</p>
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
            <h2 className="text-base font-bold text-slate-900">Events For You</h2>
            <button
              onClick={() => navigate('/events')}
              className="text-xs text-primary font-semibold flex items-center gap-0.5"
            >
              See All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {eventsLoading ? (
            <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <SkeletonEventCard key={i} />)}
            </div>
          ) : (
            <motion.div
              className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {forYouEvents.map((e) => (
                <motion.div key={e.id} variants={cardItem}>
                  <EventCard event={e} compact />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Hot Jobs — Coming Soon teaser */}
        <section>
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              Hot Jobs <Flame className="w-4 h-4 text-orange-500" />
            </h2>
            <button
              onClick={() => setShowJobsModal(true)}
              className="text-xs text-primary font-semibold flex items-center gap-0.5"
            >
              See All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <motion.button
            onClick={() => setShowJobsModal(true)}
            className="mx-4 w-[calc(100%-2rem)] bg-primary rounded-2xl p-5 text-left"
            whileTap={{ scale: 0.98 }}
          >
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1">Coming Soon</p>
            <p className="text-white text-base font-bold leading-tight">
              Global tech opportunities for Filipino developers
            </p>
            <p className="text-white/60 text-xs mt-2">
              Jobs Board launches with the full MVP — stay tuned!
            </p>
          </motion.button>
        </section>

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
              View All <ChevronRight className="w-3 h-3" />
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

      {showVolunteerModal && (
        <ComingSoonModal feature="Volunteering" onClose={() => setShowVolunteerModal(false)} />
      )}
      {showJobsModal && (
        <ComingSoonModal feature="Jobs Board" onClose={() => setShowJobsModal(false)} />
      )}
      {showRedeemModal && (
        <ComingSoonModal feature="Rewards" onClose={() => setShowRedeemModal(false)} />
      )}
    </div>
  )
}
