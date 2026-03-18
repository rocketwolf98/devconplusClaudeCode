import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Zap, Clock, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Event } from '@devcon-plus/supabase'
import { useEventsStore } from '../../../stores/useEventsStore'
import { useAuthStore } from '../../../stores/useAuthStore'
import { StatusBadge } from '../../../components/StatusBadge'
import { staggerContainer, cardItem, fadeUp } from '../../../lib/animation'
import { isEventArchived } from '../../../lib/dates'

export function OrgEventManagement() {
  const navigate = useNavigate()
  const { events, fetchEvents } = useEventsStore()
  const { user } = useAuthStore()

  useEffect(() => { void fetchEvents() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const chapterEvents = events.filter((e) => e.chapter_id === (user?.chapter_id ?? null))
  const pastEvents     = chapterEvents.filter((e) => isEventArchived(e))
  const upcomingEvents = chapterEvents.filter((e) => !isEventArchived(e))
  const currentEvent   = upcomingEvents.find((e) => e.is_featured) ?? upcomingEvents[0]

  return (
    <div>
      {/* Sticky header */}
      <div className="bg-blue px-4 pt-12 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Events</h1>
            <p className="text-white/60 text-sm mt-0.5">History &amp; performance</p>
          </div>
          <button
            onClick={() => navigate('/organizer/events/create')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white text-sm font-bold rounded-xl active:bg-white/30 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </div>

      <motion.div
        className="p-4 space-y-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Upcoming ({upcomingEvents.length})
              </p>
            </div>

            {/* Featured current event */}
            {currentEvent && (
              <motion.div
                variants={cardItem}
                className="bg-blue rounded-2xl overflow-hidden shadow-blue mb-3 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/organizer/events/${currentEvent.id}`)}
                whileTap={{ scale: 0.97 }}
              >
                {currentEvent.cover_image_url && (
                  <div className="relative h-32 w-full overflow-hidden">
                    <img
                      src={currentEvent.cover_image_url}
                      alt={currentEvent.title}
                      className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue/80 to-transparent" />
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                      Current Event
                    </span>
                  </div>
                )}
                <div className="p-4 pt-3">
                  <p className="text-white font-bold text-base leading-snug">{currentEvent.title}</p>
                  {currentEvent.location && (
                    <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {currentEvent.location}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-semibold text-white/80 bg-white/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {currentEvent.points_value} XP
                    </span>
                    <span className="text-xs text-white/60">
                      {currentEvent.event_date
                        ? new Date(currentEvent.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'TBA'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Remaining upcoming events */}
            <motion.div className="space-y-2.5" variants={staggerContainer} initial="hidden" animate="visible">
              {upcomingEvents
                .filter((e) => e.id !== currentEvent?.id)
                .map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    onTap={() => navigate(`/organizer/events/${event.id}`)}
                  />
                ))}
            </motion.div>
          </motion.div>
        )}

        {/* Past events */}
        {pastEvents.length > 0 && (
          <motion.div variants={fadeUp}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Past Events
            </p>
            <motion.div className="space-y-2.5" variants={staggerContainer} initial="hidden" animate="visible">
              {pastEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onTap={() => navigate(`/organizer/events/${event.id}/summary`)}
                />
              ))}
            </motion.div>
          </motion.div>
        )}

        {pastEvents.length === 0 && upcomingEvents.length === 0 && (
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-base font-bold text-slate-700">No events yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first chapter event.</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Event row sub-component ───────────────────────────────────────────────────

interface EventRowProps {
  event: Event
  onTap: () => void
}

function EventRow({ event, onTap }: EventRowProps) {
  return (
    <motion.div
      variants={cardItem}
      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card"
    >
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={onTap}
      >
        <div className="w-11 shrink-0 bg-blue/10 rounded-xl px-2 py-2 text-center">
          <p className="text-[10px] font-bold text-blue uppercase leading-none">
            {event.event_date
              ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })
              : '—'}
          </p>
          <p className="text-lg font-black text-blue leading-none mt-0.5">
            {event.event_date ? new Date(event.event_date).getDate() : '—'}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 leading-snug">{event.title}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge
                status={
                  event.status === 'upcoming'
                    ? 'pending'
                    : event.status === 'ongoing'
                    ? 'approved'
                    : 'rejected'
                }
              />
            </div>
          </div>
          {event.location && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {event.location}
            </p>
          )}
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue/80 bg-blue/10 px-2 py-0.5 rounded-full">
            <Zap className="w-3 h-3" />
            {event.points_value} XP
          </span>
        </div>
      </div>
    </motion.div>
  )
}
