import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, MapPin, ChevronRight, Ticket, QrCode, Clock, CalendarOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import StatusPill from '../../components/StatusPill'
import { staggerContainer, cardItem, fadeUp } from '../../lib/animation'
import type { Event, EventRegistration } from '@devcon-plus/supabase'

const CHAPTERS = ['All', 'Manila', 'Cebu', 'Davao', 'Laguna', 'Iloilo', 'Pampanga', 'Bulacan', 'Bacolod', 'CDO', 'GenSan', 'Zamboanga']

const MOCK_ATTENDEES: Record<string, number> = {
  'ev-1': 342,
  'ev-2': 118,
  'ev-3': 87,
  'ev-4': 204,
  'ev-5': 53,
}

function formatEventDate(iso: string): { month: string; day: string } {
  const d = new Date(iso)
  return {
    month: d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase(),
    day:   String(d.getDate()),
  }
}

type TicketEntry = { reg: EventRegistration; event: Event }

export default function EventsList() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { events, registrations, fetchEvents, fetchRegistrations } = useEventsStore()
  const [tab, setTab] = useState<'discover' | 'tickets'>('discover')
  const [chapter, setChapter] = useState('All')

  useEffect(() => {
    void fetchEvents()
    if (user?.id) void fetchRegistrations(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const featuredEvent = events.find((e) => e.is_featured) ?? events[0]
  const listEvents = events.filter((e) => e.id !== featuredEvent?.id)

  // Build the My Tickets list: approved first, then pending; exclude rejected
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
        <h1 className="text-white text-xl font-bold mb-3">Events</h1>
        <div className="flex gap-2 mb-3">
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
        {tab === 'discover' && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {CHAPTERS.map((ch) => (
              <button
                key={ch}
                onClick={() => setChapter(ch)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  chapter === ch ? 'bg-white text-primary font-semibold' : 'bg-white/20 text-white'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        )}
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
            {/* Empty state — no events at all */}
            {events.length === 0 && (
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

            {/* Featured hero card */}
            {featuredEvent && (
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
            <motion.div
              className="px-4 space-y-3 mt-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {listEvents.length === 0 && events.length > 0 ? (
                <p className="text-center py-12 text-slate-400 text-sm">No events in this chapter yet</p>
              ) : (
                listEvents.map((event) => {
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
                })
              )}
            </motion.div>
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
              /* Empty state */
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
              /* Ticket list */
              <motion.div
                className="px-4 pt-4 space-y-3"
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

                  return (
                    <motion.button
                      key={reg.id}
                      variants={cardItem}
                      onClick={() => navigate(destination)}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-white rounded-2xl shadow-card p-4 text-left flex items-start gap-3"
                    >
                      {/* Date block */}
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

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 leading-tight flex-1 truncate">
                            {ev.title}
                          </p>
                          <StatusPill status={reg.status as 'approved' | 'pending'} />
                        </div>
                        {ev.location && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 shrink-0" /> {ev.location}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            +{ev.points_value} pts
                          </span>
                          {isApproved ? (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <QrCode className="w-3 h-3" /> View Ticket
                            </span>
                          ) : (
                            <span className="text-[10px] text-yellow-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Awaiting approval
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
