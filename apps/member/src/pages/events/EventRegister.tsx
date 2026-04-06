import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useEventsStore } from '../../stores/useEventsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'

interface EmailParams { memberName: string; eventTitle: string; eventDate: string; eventLocation?: string; pointsValue: number; ticketUrl: string }
function buildConfirmationEmail({ memberName, eventTitle, eventDate, eventLocation, pointsValue, ticketUrl }: EmailParams): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><style>body{margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.w{max-width:390px;margin:0 auto}.hd{background:#1E2A56;padding:28px 24px;text-align:center;color:#fff;font-size:22px;font-weight:900}.bd{background:#fff;padding:28px 24px}.ft{background:#1E2A56;padding:20px 24px;text-align:center}h2{color:#0F172A;font-size:20px;font-weight:800;margin:0 0 8px}p{color:#334155;font-size:14px;line-height:1.65;margin:0 0 16px}.row{font-size:13px;margin-bottom:10px}.lbl{color:#94A3B8;font-size:12px;margin-right:8px}.val{color:#0F172A;font-weight:600}.badge{display:inline-block;background:#DCFCE7;color:#16A34A;font-weight:700;font-size:13px;padding:4px 12px;border-radius:99px}.cta{display:block;background:#367BDD;color:#fff;font-weight:700;font-size:15px;text-align:center;text-decoration:none;padding:14px 24px;border-radius:14px;margin-top:24px}.ft p{color:rgba(255,255,255,.45);font-size:11px;margin:0}hr{border:none;border-top:1px solid #E2E8F0;margin:20px 0}</style></head><body><div class="w"><div class="hd">DEVCON<span style="color:#EA641D">+</span></div><div class="bd"><h2>You're registered! 🎉</h2><p>Hi ${memberName},</p><p>Your spot has been confirmed for <strong>${eventTitle}</strong>. See you there!</p><hr/><div class="row"><span class="lbl">Event</span><span class="val">${eventTitle}</span></div><div class="row"><span class="lbl">Date</span><span class="val">${eventDate}</span></div>${eventLocation ? `<div class="row"><span class="lbl">Location</span><span class="val">${eventLocation}</span></div>` : ''}<div class="row"><span class="lbl">Points</span><span class="badge">+${pointsValue} XP on attendance</span></div><hr/><p style="font-size:13px;color:#64748B">Show your QR ticket at the venue entrance to check in.</p><a href="${ticketUrl}" class="cta">View My Ticket</a></div><div class="ft"><p>DEVCON Philippines — Sync. Support. Succeed.</p></div></div></body></html>`
}

export default function EventRegister() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { events, registrations, register } = useEventsStore()
  const { user } = useAuthStore()
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const event = events.find((e) => e.slug === slug)
  const eventId = event?.id ?? ''
  if (!event || !user) return null

  // Block cross-chapter registration for locked events
  if (event.is_chapter_locked === true && event.chapter_id !== user.chapter_id) {
    navigate(`/events/${slug}`, { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    setSubmitting(true)
    setError(null)
    try {
      await register(eventId, user.id)
      // Check the returned registration status from the store
      const reg = useEventsStore.getState().registrations.find((r) => r.event_id === eventId)
      const destination = reg?.status === 'approved'
        ? `/events/${slug}/ticket`
        : `/events/${slug}/pending`

      // Fire-and-forget confirmation email for auto-approved registrations
      if (reg?.status === 'approved') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const eventDate = event.event_date
            ? new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            : 'Date TBA'
          const ticketUrl = `${window.location.origin}/events/${slug}/ticket`
          void supabase.functions.invoke('send-email', {
            body: {
              to: user.email,
              subject: `You're registered for ${event.title}!`,
              html: buildConfirmationEmail({ memberName: user.full_name, eventTitle: event.title, eventDate, eventLocation: event.location ?? undefined, pointsValue: event.points_value ?? 100, ticketUrl }),
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        }
      }

      navigate(destination, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
      setSubmitting(false)
    }
  }

  // If already registered, redirect to the appropriate screen
  const existingReg = registrations.find((r) => r.event_id === eventId)
  if (existingReg) {
    const destination = existingReg.status === 'approved'
      ? `/events/${slug}/ticket`
      : existingReg.status === 'rejected'
        ? `/events/${slug}`
        : `/events/${slug}/pending`
    navigate(destination, { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
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

        {error && (
          <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!agreed || submitting}
          className="w-full bg-primary text-white font-bold py-4 rounded-2xl disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : 'Confirm Registration'}
        </button>
      </form>
    </div>
  )
}
