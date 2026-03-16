import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Users, MapPin, ChevronRight, Ticket, QrCode, Clock,
  CalendarOff, SlidersHorizontal, Check, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import StatusPill from '../../components/StatusPill'
import { SkeletonEventCard, SkeletonFeaturedEvent } from '../../components/Skeleton'
import { staggerContainer, cardItem, fadeUp } from '../../lib/animation'
import { isEventArchived } from '../../lib/dates'
import { supabase } from '../../lib/supabase'
import { CHAPTERS as MOCK_CHAPTERS } from '@devcon-plus/supabase'
import type { Event, EventRegistration, Chapter } from '@devcon-plus/supabase'

const MOCK_ATTENDEES: Record<string, number> = {
  'ev-1': 342,
  'ev-2': 118,
  'ev-3': 87,
  'ev-4': 204,
  'ev-5': 53,
}

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
  const [chapters, setChapters] = useState<Chapter[]>(MOCK_CHAPTERS)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [showChapterSheet, setShowChapterSheet] = useState(false)

  useEffect(() => {
    void fetchEvents()
    if (user?.id) void fetchRegistrations(user.id)

    // Try to fetch real chapters; fall back to mock on error
    supabase
      .from('chapters')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
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
    <div>
      {/* ── Header ── */}
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-4 rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">Events</h1>
          {tab === 'discover' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowChapterSheet(true)}
              className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {selectedChapterName ?? 'All Chapters'}
            </motion.button>
          )}
        </div>
        <div className="flex gap-2">
          {(['discover', 'tickets'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                tab === t ? 'bg-white text-primary' : 'bg-white/20 text-white'
              }`}
            >
              {t === 'discover' ? 'Discover' : 'My Tickets'}
              {t === 'tickets' && ticketCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  tab === 'tickets' ? 'bg-primary text-white' : 'bg-white/30 text-white'
                }`}>
                  {ticketCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

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
              <div className="px-4 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <SkeletonFeaturedEvent />
                {[1, 2, 3].map((i) => <SkeletonEventCard key={i} />)}
              </div>
            )}

            {/* Empty state — no events at all */}
            {!isLoading && events.length === 0 && (
              <div className="flex flex-col items-center justify-center px-8 pt-20 pb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CalendarOff className="w-8 h-8 text-primary/50" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Events coming soon</h3>
                <p className="text-sm text-slate-500 text-center">
                  Your chapter's next events will appear here. Check back shortly!
                </p>
              </div>
            )}

            {/* Empty state — chapter filter yields nothing */}
            {!isLoading && events.length > 0 && filteredEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center px-8 pt-20 pb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CalendarOff className="w-8 h-8 text-primary/50" />
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
              <motion.div
                className="px-4 pt-4 pb-2"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <button
                  onClick={() => navigate(`/events/${featuredEvent.id}`)}
                  className="w-full bg-navy rounded-2xl p-5 text-left"
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-3.5 h-3.5 text-gold" />
                    <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                      Featured Event
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight">
                    {featuredEvent.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-3 text-white/60 text-xs">
                    {featuredEvent.event_date && (
                      <span>
                        {new Date(featuredEvent.event_date).toLocaleDateString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    )}
                    {featuredEvent.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {featuredEvent.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5 text-white/50 text-xs">
                      <Users className="w-3.5 h-3.5" />
                      <span>{(MOCK_ATTENDEES[featuredEvent.id] ?? 0).toLocaleString()} attending</span>
                    </div>
                    <span className="text-gold text-xs font-bold">
                      +{featuredEvent.points_value} pts
                    </span>
                  </div>
                  <div className="mt-3 bg-primary rounded-xl py-2.5 text-center">
                    <span className="text-white text-sm font-semibold">View Event</span>
                  </div>
                </button>
              </motion.div>
            )}

            {/* Event list — staggered */}
            {!isLoading && filteredEvents.length > 0 && (
              <motion.div
                className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2"
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
                      onClick={() => navigate(`/events/${event.id}`)}
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
                            <MapPin className="w-3 h-3 shrink-0" /> {event.location}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            +{event.points_value} pts
                          </span>
                          {MOCK_ATTENDEES[event.id] && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              {MOCK_ATTENDEES[event.id]}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
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
            {myTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-8 pt-24">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Ticket className="w-8 h-8 text-primary/50" />
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
                className="px-4 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:max-w-4xl md:mx-auto"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {myTickets.map(({ reg, event: ev }) => {
                  const dateParts = ev.event_date ? formatEventDate(ev.event_date) : null
                  const isApproved = reg.status === 'approved'
                  const destination = isApproved
                    ? `/events/${ev.id}/ticket`
                    : `/events/${ev.id}/pending`
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
                            <MapPin className="w-3 h-3 shrink-0" /> {ev.location}
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
                              <Ticket className="w-3 h-3" /> Ticket expired
                            </span>
                          ) : lifecycle === 'normal' && (isApproved ? (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <QrCode className="w-3 h-3" /> View Ticket
                            </span>
                          ) : (
                            <span className="text-[10px] text-yellow-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Awaiting approval
                            </span>
                          ))}
                        </div>
                      </div>
                      {!isExpired && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />}
                    </motion.button>
                  )
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chapter filter bottom sheet ── */}
      <AnimatePresence>
        {showChapterSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChapterSheet(false)}
            />
            {/* Sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-4 pt-4 pb-8"
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
                  <X className="w-4 h-4 text-slate-500" />
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
                  <Check className="w-4 h-4 text-primary" />
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
                          <Check className="w-4 h-4 text-primary" />
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
