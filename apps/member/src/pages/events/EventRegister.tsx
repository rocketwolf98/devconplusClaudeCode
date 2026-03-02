import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useEventsStore } from '../../stores/useEventsStore'
import { useAuthStore } from '../../stores/useAuthStore'

export default function EventRegister() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, register } = useEventsStore()
  const { user } = useAuthStore()
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const event = events.find((e) => e.id === id)
  if (!event || !user || !id) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    setSubmitting(true)
    register(id)
    setTimeout(() => {
      navigate(event.requires_approval ? `/events/${id}/pending` : `/events/${id}/ticket`, { replace: true })
    }, 500)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-xl font-bold">Register</h1>
        <p className="text-white/60 text-sm mt-1">{event.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Your Details (pre-filled)</p>

        {[
          { label: 'Full Name',         value: user.full_name },
          { label: 'Email',             value: user.email },
          { label: 'School / Company',  value: user.school_or_company ?? '' },
        ].map(({ label, value }) => (
          <div key={label}>
            <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
            <input
              value={value}
              readOnly
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-100 text-slate-500"
            />
          </div>
        ))}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 accent-blue"
          />
          <span className="text-sm text-slate-600">
            I agree to the Terms & Conditions and Privacy Policy for this event.
          </span>
        </label>

        <button
          type="submit"
          disabled={!agreed || submitting}
          className="w-full bg-blue text-white font-bold py-4 rounded-2xl disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : 'Confirm Registration'}
        </button>
      </form>
    </div>
  )
}
