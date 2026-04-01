import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Ticket, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEventsStore } from '../../stores/useEventsStore'
import { useVolunteerStore } from '../../stores/useVolunteerStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import { getEventThemeStyle } from '../../lib/eventTheme'
import NotFound from '../NotFound'

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { events, registrations } = useEventsStore()
  const { user } = useAuthStore()
  const { loadApplications, getApplicationByEventId } = useVolunteerStore()
  const event = events.find((e) => e.slug === slug)
  const eventId = event?.id

  useEffect(() => {
    loadApplications()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reg = registrations.find((r) => r.event_id === eventId)
  const volunteerApp = eventId ? getApplicationByEventId(eventId) : undefined

  const isChapterLocked = event?.is_chapter_locked === true && event.chapter_id !== user?.chapter_id

  const [eventChapterName, setEventChapterName] = useState<string | null>(null)
  useEffect(() => {
    if (isChapterLocked && event?.chapter_id) {
      supabase
        .from('chapters')
        .select('name')
        .eq('id', event.chapter_id)
        .single()
        .then(({ data }) => setEventChapterName(data?.name ?? null))
    }
  }, [isChapterLocked, event?.chapter_id])

  if (!event) return <NotFound />

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBA'

  return (
    <motion.div
      className="min-h-screen bg-slate-50"
      style={getEventThemeStyle(event.devcon_category)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Cover image */}
      {event.cover_image_url ? (
        <img src={event.cover_image_url} alt={event.title} className="w-full h-52 object-cover rounded-b-3xl" />
      ) : (
        <div className="w-full h-52 bg-primary flex items-center justify-center rounded-b-3xl">
          <CalendarDays className="w-20 h-20 text-white/20" />
        </div>
      )}

      {/* Back button — fixed so it stays visible over the cover image */}
      <motion.button
        onClick={() => navigate(-1)}
        whileTap={{ scale: 0.95 }}
        className="fixed top-14 left-4 z-20 bg-white/80 backdrop-blur rounded-full w-10 h-10 flex items-center justify-center shadow-card text-slate-700"
      >
        <ArrowLeft className="w-5 h-5" />
      </motion.button>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">{dateStr}</p>
          <h1 className="text-xl font-bold text-slate-900">{event.title}</h1>
          {event.location && (
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {event.location}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <div className="bg-primary/10 rounded-xl px-3 py-2 flex-1 text-center">
            <p className="text-primary text-xs font-medium">Points Value</p>
            <p className="text-primary font-bold">+{event.points_value} pts</p>
          </div>
          <div className="bg-slate-100 rounded-xl px-3 py-2 flex-1 text-center">
            <p className="text-slate-500 text-xs font-medium">Status</p>
            <p className="text-slate-700 font-bold capitalize">{event.status}</p>
          </div>
        </div>

        {event.description && (
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">About</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* CTA based on registration state */}
        <div className="pt-2 space-y-3">
          {!reg ? (
            isChapterLocked ? (
              <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold py-4 rounded-2xl text-center text-sm">
                This event is exclusive to {eventChapterName ?? "this chapter's"} members
              </div>
            ) : (
              <button
                onClick={() => navigate(`/events/${slug}/register`)}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl"
              >
                Request to Join
              </button>
            )
          ) : reg.status === 'pending' ? (
            <button
              onClick={() => navigate(`/events/${slug}/pending`)}
              className="w-full bg-yellow-400 text-white font-bold py-4 rounded-2xl"
            >
              View Pending Status
            </button>
          ) : reg.status === 'approved' ? (
            <button
              onClick={() => navigate(`/events/${slug}/ticket`)}
              className="w-full bg-green text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <Ticket className="w-5 h-5" />
              View My Ticket
            </button>
          ) : (
            <div className="w-full bg-red/10 text-red font-semibold py-4 rounded-2xl text-center">
              Registration Rejected
            </div>
          )}

          {/* Volunteer CTA — only for upcoming events */}
          {event.status === 'upcoming' && (
            volunteerApp ? (
              <div className="w-full border border-slate-200 rounded-xl py-3 px-4 flex items-center justify-center gap-2">
                <Heart className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-500">
                  Volunteer Application:{' '}
                  <span
                    className={
                      volunteerApp.status === 'approved'
                        ? 'text-green font-semibold'
                        : volunteerApp.status === 'rejected'
                          ? 'text-red font-semibold'
                          : 'text-yellow-500 font-semibold'
                    }
                  >
                    {volunteerApp.status.charAt(0).toUpperCase() + volunteerApp.status.slice(1)}
                  </span>
                </span>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/events/${slug}/volunteer`)}
                className="w-full border border-primary text-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                <Heart className="w-5 h-5" />
                Volunteer for this Event
              </motion.button>
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}
