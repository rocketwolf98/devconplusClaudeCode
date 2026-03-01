import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Ticket } from 'lucide-react'
import { useEventsStore } from '../../stores/useEventsStore'

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, registrations } = useEventsStore()
  const event = events.find((e) => e.id === id)
  const reg = registrations.find((r) => r.event_id === id)

  if (!event) return <div className="p-4 text-center text-slate-400 pt-20">Event not found</div>

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBA'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cover image */}
      {event.cover_image_url ? (
        <img src={event.cover_image_url} alt={event.title} className="w-full h-52 object-cover rounded-b-3xl" />
      ) : (
        <div className="w-full h-52 bg-gradient-to-br from-blue to-navy flex items-center justify-center rounded-b-3xl">
          <CalendarDays className="w-20 h-20 text-white/20" />
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-14 left-4 bg-white/80 backdrop-blur rounded-full w-10 h-10 flex items-center justify-center shadow-card text-slate-700"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

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
          <div className="bg-blue/10 rounded-xl px-3 py-2 flex-1 text-center">
            <p className="text-blue text-xs font-medium">Points Value</p>
            <p className="text-blue font-bold">+{event.points_value} pts</p>
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
        <div className="pt-2">
          {!reg ? (
            <button
              onClick={() => navigate(`/events/${id}/register`)}
              className="w-full bg-blue text-white font-bold py-4 rounded-2xl"
            >
              Request to Join
            </button>
          ) : reg.status === 'pending' ? (
            <button
              onClick={() => navigate(`/events/${id}/pending`)}
              className="w-full bg-yellow-400 text-white font-bold py-4 rounded-2xl"
            >
              View Pending Status
            </button>
          ) : reg.status === 'approved' ? (
            <button
              onClick={() => navigate(`/events/${id}/ticket`)}
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
        </div>
      </div>
    </div>
  )
}
