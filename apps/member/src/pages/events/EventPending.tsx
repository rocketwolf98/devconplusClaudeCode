import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, RefreshCw, XCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEventsStore } from '../../stores/useEventsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'

// Countdown border geometry — matches EventTicket
const RECT_SIZE = 220
const RECT_RX = 24
const RECT_CIRCUMFERENCE = 4 * (RECT_SIZE - 2 * RECT_RX) + 2 * Math.PI * RECT_RX

export default function EventPending() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { events, registrations, subscribeToRegistration } = useEventsStore()
  const { user } = useAuthStore()

  const event = events.find((e) => e.slug === slug)
  const eventId = event?.id
  const reg = registrations.find((r) => r.event_id === eventId && r.user_id === user?.id)

  // QR token state
  const [token, setToken] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Rejection state
  const [isRejected, setIsRejected] = useState(false)

  // If already approved (page refresh after approval), go straight to ticket
  useEffect(() => {
    if (reg?.status === 'approved') {
      navigate(`/events/${slug}/ticket`, { replace: true })
    }
    if (reg?.status === 'cancelled') {
      navigate('/events', { replace: true })
    }
  }, [reg?.status, slug, navigate])

  // Realtime: watch for approval or rejection at the door
  useEffect(() => {
    if (!reg?.id) return
    const unsubscribe = subscribeToRegistration(reg.id, (status) => {
      if (status === 'approved') {
        navigate(`/events/${slug}/ticket`, { replace: true })
      } else if (status === 'rejected') {
        setIsRejected(true)
      }
    })
    return unsubscribe
  }, [reg?.id, slug, navigate, subscribeToRegistration])

  // Token rotation — fetch on mount and 6s before each expiry
  useEffect(() => {
    if (!reg) return
    let cancelled = false
    let inErrorState = false

    async function fetchToken() {
      if (cancelled || inErrorState) return
      setIsRefreshing(true)
      setFetchError(false)

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (!session) {
        navigate('/sign-in', { replace: true })
        return
      }

      const invokeWithToken = (accessToken: string) =>
        supabase.functions.invoke<{ token: string; expires_at: number }>(
          'generate-pending-qr',
          {
            body: { registration_id: reg!.id },
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )

      let { data, error } = await invokeWithToken(session.access_token)
      if (cancelled) return

      if (error || !data?.token) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession()
        if (cancelled) return
        if (refreshErr || !refreshData.session) {
          navigate('/sign-in', { replace: true })
          return
        }
        ;({ data, error } = await invokeWithToken(refreshData.session.access_token))
        if (cancelled) return
      }

      if (error || !data?.token) {
        setFetchError(true)
        inErrorState = true
      } else {
        setToken(data.token)
        setSecondsLeft(30)
      }
      setIsRefreshing(false)
    }

    void fetchToken()

    const intervalId = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === 6) void fetchToken()
        return prev <= 1 ? 1 : prev - 1
      })
    }, 1000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [reg?.id, retryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const strokeDashoffset = RECT_CIRCUMFERENCE * (1 - secondsLeft / 30)
  const ringColor = fetchError ? '#EF4444' : secondsLeft > 10 ? '#F8C630' : '#EF4444'

  // ── Rejection screen ──────────────────────────────────────────────────────
  if (isRejected) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-20 h-20 rounded-full bg-red/10 flex items-center justify-center mb-4"
        >
          <XCircle className="w-10 h-10 text-red" />
        </motion.div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Registration Declined</h1>
        <p className="text-sm text-slate-500 mb-8">
          Your registration for <strong>{event?.title}</strong> was not approved by the chapter officer.
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/events')}
          className="w-full max-w-xs bg-primary text-white font-bold py-4 rounded-2xl"
        >
          Back to Events
        </motion.button>
      </div>
    )
  }

  // ── Main pending screen ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center pb-24">

      {/* Status header */}
      <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-yellow-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Awaiting Approval</h1>
      <p className="text-sm text-slate-500 mb-2">
        Your registration for <strong>{event?.title}</strong> requires officer approval.
      </p>

      {/* Divider */}
      <div className="w-full max-w-xs border-t border-dashed border-slate-200 my-5" />

      {/* Show-at-door QR section */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        Show at the Door
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key="pending-qr"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[240px] h-[240px] flex items-center justify-center mb-3"
        >
          {/* Countdown border */}
          <svg width={240} height={240} className="absolute pointer-events-none" aria-hidden="true">
            <rect
              x={10} y={10} width={RECT_SIZE} height={RECT_SIZE}
              rx={RECT_RX} ry={RECT_RX}
              fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={4}
            />
            <rect
              x={10} y={10} width={RECT_SIZE} height={RECT_SIZE}
              rx={RECT_RX} ry={RECT_RX}
              fill="none" stroke={ringColor} strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={RECT_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
            />
          </svg>

          {/* QR container */}
          <div
            className="p-4 bg-white rounded-2xl shadow-[0_8px_32px_rgba(30,42,86,0.12)]"
            style={{ opacity: isRefreshing || !token ? 0.4 : 1, transition: 'opacity 0.3s' }}
          >
            {token ? (
              <QRCodeSVG value={token} size={172} level="M" fgColor="#1E2A56" bgColor="#FFFFFF" />
            ) : (
              <div className="w-[172px] h-[172px] flex items-center justify-center">
                <div
                  className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: '#F8C630 transparent transparent transparent' }}
                />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Countdown / retry */}
      {fetchError ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setRetryKey(k => k + 1)}
          className="flex items-center gap-1.5 text-red text-xs font-semibold px-4 py-1.5 rounded-full border border-red/30 bg-red/5 mb-4"
        >
          <RefreshCw className="w-3 h-3" />
          Tap to retry
        </motion.button>
      ) : (
        <p className="text-xs font-medium text-slate-400 mb-4">
          {isRefreshing ? 'Refreshing…' : `Refreshes in ${secondsLeft}s`}
        </p>
      )}

      <p className="text-[11px] text-slate-400 max-w-[220px] leading-relaxed mb-6">
        The organizer will scan this QR to approve your entry on the spot.
      </p>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/events')}
        className="w-full max-w-xs border border-slate-200 text-slate-600 font-semibold py-3 rounded-2xl text-sm"
      >
        Back to Events
      </motion.button>
    </div>
  )
}
