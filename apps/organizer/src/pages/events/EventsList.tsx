import { useNavigate } from 'react-router-dom'
import { EVENTS } from '@devcon-plus/supabase'
import { StatusBadge } from '../../components/StatusBadge'

export function EventsList() {
  const navigate = useNavigate()

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Events</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your chapter events</p>
        </div>
        <button
          onClick={() => navigate('/events/create')}
          className="px-4 py-2 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
        >
          + New Event
        </button>
      </div>

      <div className="space-y-3">
        {EVENTS.map((event) => {
          const formattedDate = event.event_date
            ? new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'TBA'

          return (
            <div
              key={event.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-card hover:border-blue hover:shadow-blue transition-all cursor-pointer"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <div className="flex items-start gap-4">
                {/* Date badge */}
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
                    <p className="text-xs text-slate-400 mt-0.5">📍 {event.location}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-semibold text-blue/80 bg-blue/10 px-2 py-0.5 rounded-full">
                      ⭐ {event.points_value} XP
                    </span>
                    {event.requires_approval && (
                      <span className="text-xs text-slate-400">Approval required</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
