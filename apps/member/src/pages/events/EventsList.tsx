import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, MapPin, ChevronRight, Ticket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEventsStore } from '../../stores/useEventsStore'
import { staggerContainer, cardItem, fadeUp } from '../../lib/animation'

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

export default function EventsList() {
  const navigate = useNavigate()
  const { events } = useEventsStore()
  const [tab, setTab] = useState<'discover' | 'tickets'>('discover')
  const [chapter, setChapter] = useState('All')

  const featuredEvent = events.find((e) => e.is_featured) ?? events[0]
  const listEvents = events.filter((e) => e.id !== featuredEvent?.id)

  return (
    <div>
      {/* ── Header ── */}
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-4 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold mb-3">Events</h1>
        <div className="flex gap-2 mb-3">
          {(['discover', 'tickets'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? 'bg-white text-blue font-semibold' : 'bg-white/20 text-white'
              }`}
            >
              {t === 'discover' ? 'Discover' : 'My Tickets'}
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
                  chapter === ch ? 'bg-white text-blue font-semibold' : 'bg-white/20 text-white'
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
                  <div className="mt-3 bg-blue rounded-xl py-2.5 text-center">
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
              {listEvents.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-sm">No events found</p>
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
                        <div className="w-12 h-14 rounded-xl bg-blue/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-blue leading-none">
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
                          <span className="text-[10px] font-semibold bg-blue/10 text-blue px-2 py-0.5 rounded-full">
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
            className="bg-slate-50 min-h-screen flex flex-col items-center justify-center px-8 pb-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center mb-4">
              <Ticket className="w-8 h-8 text-blue/50" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No tickets yet</h3>
            <p className="text-sm text-slate-500 text-center mb-5">
              Register for an event to get your QR ticket here.
            </p>
            <button
              onClick={() => setTab('discover')}
              className="bg-blue text-white font-semibold text-sm px-6 py-2.5 rounded-xl"
            >
              Browse Events
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
