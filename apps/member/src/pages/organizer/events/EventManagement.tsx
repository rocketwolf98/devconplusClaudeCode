import { useNavigate } from 'react-router-dom'
import { MapPin, Zap, TrendingUp, Users, CalendarCheck, Clock, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { EVENTS } from '@devcon-plus/supabase'
import { StatusBadge } from '../../../components/StatusBadge'
import { staggerContainer, cardItem, fadeUp } from '../../../lib/animation'

// Mock performance stats — replace with real Supabase aggregates when provisioned
const MOCK_STATS = {
  totalRegistered: 24,
  attendanceRate: 78,
  avgPointsEarned: 210,
  approvalRate: 91,
}

export function OrgEventManagement() {
  const navigate = useNavigate()

  const currentEvent = EVENTS.find((e) => e.status === 'upcoming' && e.is_featured) ?? EVENTS[0]
  const upcomingEvents = EVENTS.filter((e) => e.status === 'upcoming')
  const pastEvents = EVENTS.filter((e) => e.status === 'past')

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
        {/* Performance statistics */}
        <motion.div variants={fadeUp}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            Performance Insights
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4">
              <div className="w-9 h-9 rounded-xl bg-blue/10 flex items-center justify-center mb-2.5">
                <Users className="w-4.5 h-4.5 text-blue" />
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none">
                {MOCK_STATS.totalRegistered}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Total Registered</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4">
              <div className="w-9 h-9 rounded-xl bg-green/10 flex items-center justify-center mb-2.5">
                <CalendarCheck className="w-4.5 h-4.5 text-green" />
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none">
                {MOCK_STATS.attendanceRate}%
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Attendance Rate</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4">
              <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center mb-2.5">
                <Zap className="w-4.5 h-4.5 text-gold" />
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none">
                {MOCK_STATS.avgPointsEarned}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Avg XP Earned</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4">
              <div className="w-9 h-9 rounded-xl bg-blue/10 flex items-center justify-center mb-2.5">
                <TrendingUp className="w-4.5 h-4.5 text-blue" />
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none">
                {MOCK_STATS.approvalRate}%
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Approval Rate</p>
            </div>
          </div>
        </motion.div>

        {/* Current / upcoming events */}
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
                  <EventRow key={event.id} event={event} onTap={() => navigate(`/organizer/events/${event.id}`)} />
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
                <EventRow key={event.id} event={event} onTap={() => navigate(`/organizer/events/${event.id}`)} />
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

// ─── Shared event row sub-component ───────────────────────────────────────────

interface EventRowProps {
  event: (typeof EVENTS)[number]
  onTap: () => void
}

function EventRow({ event, onTap }: EventRowProps) {
  return (
    <motion.div
      variants={cardItem}
      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card cursor-pointer"
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
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
