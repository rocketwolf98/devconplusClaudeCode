import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEventsStore } from '../../../stores/useEventsStore'
import { StatusBadge } from '../../../components/StatusBadge'
import { staggerContainer, cardItem } from '../../../lib/animation'
import { isEventArchived } from '../../../lib/dates'

export function OrgEventsList() {
  const navigate = useNavigate()
  const { events, fetchEvents } = useEventsStore()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  const upcomingEvents = events.filter((e) => !isEventArchived(e))
  const pastEvents     = events.filter((e) => isEventArchived(e))
  const displayEvents  = activeTab === 'upcoming' ? upcomingEvents : pastEvents

  useEffect(() => { void fetchEvents() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Events</h1>
            <p className="text-white/60 text-sm mt-0.5">Manage your chapter events</p>
          </div>
          <button
            onClick={() => navigate('/organizer/events/create')}
            className="px-4 py-2 bg-white/20 text-white text-sm font-bold rounded-xl hover:bg-white/30 transition-colors shrink-0"
          >
            + New Event
          </button>
        </div>

        {/* Upcoming / Past tabs */}
        <div className="flex gap-1 bg-white/20 p-1 rounded-xl w-fit mt-3">
          {(['upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-white text-blue'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {tab} ({tab === 'upcoming' ? upcomingEvents.length : pastEvents.length})
            </button>
          ))}
        </div>
      </div>

      <motion.div
        key={activeTab}
        className="p-4 space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {displayEvents.map((event) => {
          const formattedDate = event.event_date
            ? new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })
            : 'TBA'

          return (
            <motion.div
              key={event.id}
              variants={cardItem}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card hover:border-blue hover:shadow-blue transition-all cursor-pointer"
              onClick={() => navigate(`/organizer/events/${event.id}`)}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 shrink-0 bg-blue/10 rounded-xl px-2 py-2 text-center">
                  <p className="text-xs font-bold text-blue uppercase leading-none">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })
                      : '—'}
                  </p>
                  <p className="text-xl font-black text-blue leading-none mt-1">
                    {event.event_date ? new Date(event.event_date).getDate() : '—'}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-bold text-slate-900 truncate">{event.title}</p>
                    <StatusBadge status={event.status === 'upcoming' ? 'pending' : event.status === 'ongoing' ? 'approved' : 'rejected'} />
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{formattedDate}</p>
                  {event.location && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {event.location}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-semibold text-blue/80 bg-blue/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {event.points_value} XP
                    </span>
                    {event.requires_approval && (
                      <span className="text-xs text-slate-400">Approval required</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
