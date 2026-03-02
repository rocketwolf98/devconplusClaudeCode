import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Zap } from 'lucide-react'
import { EVENTS } from '@devcon-plus/supabase'

export function OrgEventDetail() {
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
    <div>
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">{event.title}</h1>
        <p className="text-white/60 text-sm mt-0.5 capitalize">{event.status}</p>
      </div>

      <div className="p-4">
        {/* Banner */}
        <div className="rounded-2xl overflow-hidden mb-6">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-48 bg-blue flex items-center justify-center">
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
          onClick={() => navigate(`/organizer/events/${event.id}/registrants`)}
          className="w-full py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
        >
          View Registrants
        </button>
      </div>
    </div>
  )
}
