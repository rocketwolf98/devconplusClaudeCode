import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useEventsStore } from '../../stores/useEventsStore'
import { useAuthStore } from '../../stores/useAuthStore'

export default function EventTicket() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, registrations } = useEventsStore()
  const { user } = useAuthStore()
  const event = events.find((e) => e.id === id)
  const reg = registrations.find((r) => r.event_id === id)

  if (!event || !reg || reg.status !== 'approved') {
    return (
      <div className="p-4 text-center text-slate-400 pt-20">
        Ticket not available.{' '}
        <button onClick={() => navigate(-1)} className="text-blue">Go back</button>
      </div>
    )
  }

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBA'

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center px-6 py-10">
      <button onClick={() => navigate(-1)} className="self-start text-white/60 text-sm mb-6">← Back</button>

      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-blue">
        {/* Ticket header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-blue rounded-full mx-auto flex items-center justify-center mb-2">
            <span className="text-white font-bold">D+</span>
          </div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Event Ticket</p>
          <h2 className="text-base font-bold text-slate-900 mt-1">{event.title}</h2>
          <p className="text-xs text-slate-500 mt-1">{dateStr}</p>
          {event.location && <p className="text-xs text-slate-400">📍 {event.location}</p>}
        </div>

        {/* QR code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <QRCodeSVG
              value={reg.qr_code_token ?? 'DEVCON-TICKET'}
              size={180}
              level="H"
              fgColor="#1E2A56"
            />
          </div>
        </div>

        {/* Member info */}
        <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Name</span>
            <span className="text-slate-900 font-medium">{user?.full_name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Ticket ID</span>
            <span className="text-slate-900 font-mono truncate max-w-[150px]">{reg.qr_code_token}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Points Value</span>
            <span className="text-green font-bold">+{event.points_value} pts</span>
          </div>
        </div>
      </div>

      <p className="text-white/40 text-xs text-center mt-6">
        Show this QR code at the venue entrance
      </p>
    </div>
  )
}
