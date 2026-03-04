import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useEventsStore } from '../../stores/useEventsStore'
import { useAuthStore } from '../../stores/useAuthStore'

export default function EventPending() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, registrations, subscribeToRegistration } = useEventsStore()
  const { user } = useAuthStore()

  const event = events.find((e) => e.id === id)
  const reg = registrations.find((r) => r.event_id === id && r.user_id === user?.id)

  // If already approved (e.g. page refresh after approval), go straight to ticket
  useEffect(() => {
    if (reg?.status === 'approved') {
      navigate(`/events/${id}/ticket`, { replace: true })
    }
  }, [reg?.status, id, navigate])

  // Subscribe to realtime updates on this registration row
  useEffect(() => {
    if (!reg?.id) return
    const unsubscribe = subscribeToRegistration(reg.id, () => {
      navigate(`/events/${id}/ticket`, { replace: true })
    })
    return unsubscribe
  }, [reg?.id, id, navigate, subscribeToRegistration])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
        <Clock className="w-10 h-10 text-yellow-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">Awaiting Approval</h1>
      <p className="text-sm text-slate-500 mb-6">
        Your registration for <strong>{event?.title}</strong> is pending review by the chapter officer.
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 w-full max-w-xs mb-8">
        <p className="text-xs text-yellow-700 font-semibold">Status: Pending Approval</p>
        <p className="text-xs text-yellow-600 mt-1">This page will update automatically when approved.</p>
      </div>
      <button
        onClick={() => navigate('/events')}
        className="w-full max-w-xs bg-primary text-white font-bold py-4 rounded-2xl"
      >
        Back to Events
      </button>
    </div>
  )
}
