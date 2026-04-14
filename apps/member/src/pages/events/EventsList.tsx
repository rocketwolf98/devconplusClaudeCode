import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UsersGroupRoundedOutline, MapPointOutline, AltArrowRightOutline, TicketOutline, QRCodeOutline, ClockCircleOutline, CalendarMarkOutline, CheckCircleOutline, CloseCircleLineDuotone, FilterLinear } from 'solar-icon-set'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import StatusPill from '../../components/StatusPill'
import EventCard from '../../components/EventCard'
import { SkeletonEventCard, SkeletonFeaturedEvent } from '../../components/Skeleton'
import { staggerContainer, cardItem, fadeUp } from '../../lib/animation'
import { isEventArchived } from '../../lib/dates'
import { supabase } from '../../lib/supabase'
import type { Event, EventRegistration, Chapter } from '@devcon-plus/supabase'

// Flower-of-life pattern matching Rewards/Dashboard
const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="0" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="0" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="30" cy="30" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/></svg>`
const PATTERN_BG = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

const REGIONS = ['Luzon', 'Visayas', 'Mindanao'] as const

function formatEventDate(iso: string): { month: string; day: string } {
  const d = new Date(iso)
  return {
    month: d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
  }
}

type TicketEntry = { reg: EventRegistration; event: Event }

function getEventLifecycleState(ev: Event): 'in_progress' | 'done' | 'normal' {
  const now = new Date()
  if (isEventArchived(ev, now)) return 'done'
  if (ev.event_date && new Date(ev.event_date) <= now) return 'in_progress'
  return 'normal'
}

export default function EventsList() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { events, registrations, fetchEvents, fetchRegistrations, isLoading } = useEventsStore()
  const [tab, setTab] = useState<'discover' | 'tickets'>('discover')

  // Chapter filter state
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(user?.chapter_id ?? null)
  const [showChapterSheet, setShowChapterSheet] = useState(false)
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({})
  const [attendeeDetails, setAttendeeDetails] = useState<Record<string, { avatar_url: string | null; full_name: string }[]>>({})

  useEffect(() => {
    void fetchEvents()
    if (user?.id) void fetchRegistrations(user.id)

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

    // Try to fetch real chapters; fall back silently on error
    supabase
      .from('chapters')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) {
          setChapters(data as Chapter[])
        }
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter events by selected chapter, excluding archived events in Discover tab
  const activeEvents = events.filter((e) => !isEventArchived(e))

  const filteredEvents = selectedChapterId
    ? activeEvents.filter((e) => e.chapter_id === selectedChapterId)
    : activeEvents

  const featuredEvent = filteredEvents.find((e) => e.is_featured) ?? filteredEvents[0]
  const listEvents = filteredEvents.filter((e) => e.id !== featuredEvent?.id)

  const selectedChapterName = selectedChapterId
    ? (chapters.find((c) => c.id === selectedChapterId)?.name ?? 'Chapter')
    : null

  // My Tickets: approved first, then pending; exclude rejected
  const myTickets: TicketEntry[] = registrations
    .filter((r) => r.status === 'approved' || r.status === 'pending')
    .map((r) => ({ reg: r, event: events.find((e) => e.id === r.event_id) }))
    .filter((item): item is TicketEntry => item.event !== undefined)
    .sort((a, b) => (a.reg.status === 'approved' ? -1 : 1) - (b.reg.status === 'approved' ? -1 : 1))

  const ticketCount = myTickets.length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex flex-col pointer-events-none">
        {/* ── Glassmorphism Background ── */}
        <div className="absolute inset-0 backdrop-blur-md bg-slate-50/80 pointer-events-auto -z-10" />

        {/* ── Blue Background Container ── */}
        <div 
          className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[64px]"
          style={{ 
            clipPath: 'ellipse(100% 100% at 50% 0%)',
            backgroundImage: PATTERN_BG,
            backgroundSize: '60px 60px',
            backgroundPosition: 'top center',
            backgroundRepeat: 'repeat'
          }}
        >
          {/* Header Row: Title + Icons */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-6">
            <h1 className="text-white text-[24px] font-semibold font-proxima leading-none tracking-tight">
              Events
            </h1>
            
            <div className="flex items-center gap-[8px]">
              <button 
                onClick={() => setShowChapterSheet(true)}
                className="bg-white/20 size-[42px] flex items-center justify-center rounded-full transition-colors active:bg-white/30"
                aria-label="Filter events"
              >
                <FilterLinear className="size-[20px]" color="white" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Points/Chapter Card Overlay ── */}
        <div className="relative z-10 flex flex-col px-[25px] -mt-[40px] pointer-events-none">
          {tab === 'discover' && selectedChapterName && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-[100px] bg-white rounded-[24px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.1)] border border-slate-400/30 flex items-center px-[21px] gap-4 pointer-events-auto"
            >
              <div className="size-[48px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPointOutline className="size-[24px]" color="#1152d4" />
              </div>
              <div className="flex flex-col justify-center translate-y-px">
                <p className="font-proxima text-[#6b7280] text-[14px] leading-none mb-[6px]">
                  Current Chapter
                </p>
                <p className="font-proxima font-extrabold text-[24px] text-[#1A1A1A] leading-tight line-clamp-1">
                  {selectedChapterName}
                </p>
              </div>
            </motion.div>
          )}
          
          {tab === 'tickets' && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-[100px] bg-white rounded-[24px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.1)] border border-slate-400/30 flex items-center px-[21px] gap-4 pointer-events-auto"
            >
              <div className="size-[48px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <TicketOutline className="size-[24px]" color="#1152d4" />
              </div>
              <div className="flex flex-col justify-center translate-y-px">
                <p className="font-proxima text-[#6b7280] text-[14px] leading-none mb-[6px]">
                  My Tickets
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-proxima font-extrabold text-[40px] text-[#1A1A1A] leading-none tracking-tight">
                    {ticketCount}
                  </p>
                  <p className="font-proxima font-semibold text-[20px] text-[#1A1A1A] leading-none">
                    Event{ticketCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Tabs Wrapper ── */}
        <div className="pt-4 pb-2 px-[25px] pointer-events-auto">
          <div className="flex gap-[6px] overflow-x-auto no-scrollbar max-w-4xl mx-auto">
            {(['discover', 'tickets'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap px-[12px] h-[32px] flex-1 flex items-center justify-center rounded-[128px] text-[14px] font-proxima font-bold transition-all shrink-0 ${
                  tab === t
                    ? 'bg-[#1152d4] text-white shadow-sm'
                    : 'bg-[#1152d4]/10 text-[#1152d4]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {t === 'discover' ? 'Discover' : 'My Tickets'}
                  {t === 'tickets' && ticketCount > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      tab === 'tickets' ? 'bg-white text-[#1152d4]' : 'bg-[#1152d4]/20 text-[#1152d4]'
                    }`}>
                      {ticketCount}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* ── Discover tab ── */}
        {tab === 'discover' && (
          <motion.div
            key="discover"
            className="bg-slate-50 min-h-screen pb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
          <div className="md:max-w-4xl md:mx-auto">
            {/* Loading skeletons */}
            {isLoading && (
              <div className="px-[25px] pt-4 space-y-3">
                <SkeletonFeaturedEvent />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <SkeletonEventCard />
                  <SkeletonEventCard />
                </div>
              </div>
            )}

            {/* Empty state — no events at all */}
            {!isLoading && events.length === 0 && (
              <div className="flex flex-col items-center justify-center px-[25px] pt-20 pb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CalendarMarkOutline className="w-8 h-8" color="#0b46a3" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Events coming soon</h3>
                <p className="text-sm text-slate-500 text-center">
                  Your chapter's next events will appear here. Check back shortly!
                </p>
              </div>
            )}

            {/* Empty state — chapter filter yields nothing */}
            {!isLoading && events.length > 0 && filteredEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center px-[25px] pt-20 pb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CalendarMarkOutline className="w-8 h-8" color="#0b46a3" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  No events in {selectedChapterName}
                </h3>
                <p className="text-sm text-slate-500 text-center mb-5">
                  This chapter has no upcoming events. Try a different chapter.
                </p>
                <button
                  onClick={() => setSelectedChapterId(null)}
                  className="bg-primary text-white font-semibold text-sm px-6 py-2.5 rounded-xl"
                >
                  Show All Chapters
                </button>
              </div>
            )}

            {/* Featured hero card */}
            {!isLoading && featuredEvent && (
              <div className="px-[25px] pt-4 pb-2">
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <EventCard 
                    event={featuredEvent} 
                    className="h-[300px]" 
                    attendeeCount={attendeeCounts[featuredEvent.id]} 
                    attendees={attendeeDetails[featuredEvent.id]}
                  />
                </motion.div>
              </div>
            )}

            {/* Event list — staggered */}
            {!isLoading && filteredEvents.length > 0 && (
              <motion.div
                className="px-[25px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {listEvents.map((event) => {
                  const dateParts = event.event_date ? formatEventDate(event.event_date) : null
                  return (
                    <motion.button
                      key={event.id}
                      variants={cardItem}
                      onClick={() => navigate(`/events/${event.slug}`)}
                      className="w-full bg-white rounded-2xl shadow-card p-4 text-left flex items-start gap-3"
                      whileTap={{ scale: 0.98 }}
                    >
                      {dateParts ? (
                        <div className="w-12 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary leading-none">
                            {dateParts.month}
                          </span>
                          <span className="text-xl font-black text-navy leading-tight">
                            {dateParts.day}
                          </span>
                        </div>
                      ) : (
                        <div className="w-12 h-14 rounded-xl bg-slate-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-tight">{event.title}</p>
                        {event.location && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-0.5">
                            <MapPointOutline className="w-3 h-3 shrink-0" color="#0b46a3" /> {event.location}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            +{event.points_value} pts
                          </span>
                          {attendeeCounts[event.id] && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <UsersGroupRoundedOutline className="w-3 h-3" color="#64748B" />
                              {attendeeCounts[event.id]}
                            </span>
                          )}
                        </div>
                      </div>
                      <AltArrowRightOutline className="w-4 h-4 shrink-0 mt-1" color="#CBD5E1" />
                    </motion.button>
                  )
                })}
              </motion.div>
            )}
          </div>
          </motion.div>
        )}

        {/* ── My Tickets tab ── */}
        {tab === 'tickets' && (
          <motion.div
            key="tickets"
            className="bg-slate-50 min-h-screen pb-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
          <div className="md:max-w-4xl md:mx-auto">
            {myTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-[25px] pt-24">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <TicketOutline className="w-8 h-8" color="#0b46a3" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No tickets yet</h3>
                <p className="text-sm text-slate-500 text-center mb-5">
                  Register for an event to get your QR ticket here.
                </p>
                <button
                  onClick={() => setTab('discover')}
                  className="bg-primary text-white font-semibold text-sm px-6 py-2.5 rounded-xl"
                >
                  Browse Events
                </button>
              </div>
            ) : (
              <motion.div
                className="px-[25px] pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {myTickets.map(({ reg, event: ev }) => {
                  const dateParts = ev.event_date ? formatEventDate(ev.event_date) : null
                  const isApproved = reg.status === 'approved'
                  const destination = isApproved
                    ? `/events/${ev.slug}/ticket`
                    : `/events/${ev.slug}/pending`
                  // Checked-in ticket is always "Done" regardless of event date
                  const lifecycle = reg.checked_in ? 'done' : getEventLifecycleState(ev)

                  const isExpired = lifecycle === 'done'

                  return (
                    <motion.button
                      key={reg.id}
                      variants={cardItem}
                      onClick={isExpired ? undefined : () => navigate(destination)}
                      whileTap={isExpired ? undefined : { scale: 0.98 }}
                      className={`w-full bg-white rounded-2xl shadow-card p-4 text-left flex items-start gap-3 ${
                        isExpired ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {dateParts ? (
                        <div className="w-12 h-14 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold leading-none text-slate-400">
                            {dateParts.month}
                          </span>
                          <span className={`text-xl font-black leading-tight ${
                            isExpired ? 'text-slate-400' : 'text-navy'
                          }`}>
                            {dateParts.day}
                          </span>
                        </div>
                      ) : (
                        <div className="w-12 h-14 rounded-xl bg-slate-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold leading-tight flex-1 truncate ${
                            isExpired ? 'text-slate-400' : 'text-slate-900'
                          }`}>
                            {ev.title}
                          </p>
                          {lifecycle === 'in_progress' ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green bg-green/10 px-2 py-0.5 rounded-full shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-green animate-ping" />
                              In Progress
                            </span>
                          ) : isExpired ? (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                              Expired
                            </span>
                          ) : (
                            <StatusPill status={reg.status as 'approved' | 'pending'} />
                          )}
                        </div>
                        {ev.location && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-0.5">
                            <MapPointOutline className="w-3 h-3 shrink-0" color="#0b46a3" /> {ev.location}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isExpired
                              ? 'bg-slate-100 text-slate-400 line-through'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            +{ev.points_value} pts
                          </span>
                          {isExpired ? (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <TicketOutline className="w-3 h-3" color="#64748B" /> TicketOutline expired
                            </span>
                          ) : lifecycle === 'normal' && (isApproved ? (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <QRCodeOutline className="w-3 h-3" color="#0b46a3" /> View TicketOutline
                            </span>
                          ) : (
                            <span className="text-[10px] text-yellow-600 flex items-center gap-1">
                              <ClockCircleOutline className="w-3 h-3" color="#D97706" /> Awaiting approval
                            </span>
                          ))}
                        </div>
                      </div>
                      {!isExpired && <AltArrowRightOutline className="w-4 h-4 shrink-0 mt-1" color="#CBD5E1" />}
                    </motion.button>
                  )
                })}
              </motion.div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chapter filter bottom sheet ── */}
      <AnimatePresence>
        {showChapterSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChapterSheet(false)}
            />
            {/* Sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl px-4 pt-4 pb-10"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Filter by Chapter</h2>
                <button
                  onClick={() => setShowChapterSheet(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <CloseCircleLineDuotone className="w-4 h-4" color="#EF4444" />
                </button>
              </div>

              {/* All Chapters option */}
              <button
                onClick={() => { setSelectedChapterId(null); setShowChapterSheet(false) }}
                className="w-full flex items-center justify-between py-3 border-b border-slate-100"
              >
                <span className={`text-sm font-semibold ${selectedChapterId === null ? 'text-primary' : 'text-slate-700'}`}>
                  All Chapters
                </span>
                {selectedChapterId === null && (
                  <CheckCircleOutline className="w-4 h-4" color="#0b46a3" />
                )}
              </button>

              {/* Region groups */}
              {REGIONS.map((region) => {
                const regionChapters = chapters.filter((c) => c.region === region)
                if (regionChapters.length === 0) return null
                return (
                  <div key={region} className="mt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {region}
                    </p>
                    {regionChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => { setSelectedChapterId(ch.id); setShowChapterSheet(false) }}
                        className="w-full flex items-center justify-between py-2.5 border-b border-slate-50"
                      >
                        <span className={`text-sm ${selectedChapterId === ch.id ? 'font-semibold text-primary' : 'text-slate-700'}`}>
                          {ch.name}
                        </span>
                        {selectedChapterId === ch.id && (
                          <CheckCircleOutline className="w-4 h-4" color="#0b46a3" />
                        )}
                      </button>
                    ))}
                  </div>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
