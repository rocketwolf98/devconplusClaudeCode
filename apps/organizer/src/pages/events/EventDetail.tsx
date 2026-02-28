import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Zap } from 'lucide-react'
import { EVENTS } from '@devcon-plus/supabase'

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const event = EVENTS.find((e) => e.id === id)
  if (!event) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">Event not found.</p>
      </div>
    )
  }

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'TBA'

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </button>

      {/* Banner */}
      <div className="rounded-2xl overflow-hidden mb-6">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-blue to-navy flex items-center justify-center">
            <CalendarDays className="w-16 h-16 text-white/20" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-blue">0</p>
          <p className="text-xs text-slate-400 mt-1">Registrations</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-yellow-500">0</p>
          <p className="text-xs text-slate-400 mt-1">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-green">0</p>
          <p className="text-xs text-slate-400 mt-1">Checked In</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <h1 className="text-xl font-black text-slate-900 mb-1">{event.title}</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs font-semibold text-blue bg-blue/10 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {event.points_value} XP
          </span>
          {event.requires_approval && (
            <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-full">
              Approval Required
            </span>
          )}
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full capitalize">
            {event.status}
          </span>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex gap-3 text-sm">
            <span className="text-slate-400 w-24 shrink-0">Date</span>
            <span className="text-slate-700 font-medium">{formattedDate}</span>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-slate-400 w-24 shrink-0">Location</span>
            <span className="text-slate-700 font-medium">{event.location ?? 'TBA'}</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">About</p>
          <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
        </div>
      </div>

      <button
        onClick={() => navigate(`/events/${event.id}/registrants`)}
        className="w-full py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
      >
        View Registrants
      </button>
    </div>
  )
}
