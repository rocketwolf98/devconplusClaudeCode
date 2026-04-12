// MyQR — Always-on user identity QR
// Accessible at /qr from within MemberLayout.
// Generates a k='u' token via the generate-user-qr edge function.
// The organizer scanner auto-matches this to the member's next upcoming event.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftOutline, RefreshOutline, QRCodeOutline, StarOutline } from 'solar-icon-set'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { usePointsStore } from '../../stores/usePointsStore'
import { supabase } from '../../lib/supabase'

// Countdown border geometry — matches EventTicket
const RECT_SIZE = 220
const RECT_RX   = 24
const RECT_CIRCUMFERENCE = 4 * (RECT_SIZE - 2 * RECT_RX) + 2 * Math.PI * RECT_RX

// Token TTL in seconds — must match generate-user-qr (300s)
const TOKEN_TTL = 300

export default function MyQR() {
  const navigate = useNavigate()
  const { user, initials, chapterName } = useAuthStore()
  const { spendablePoints, loadTotalPoints } = usePointsStore()

  const [token, setToken] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(TOKEN_TTL)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    loadTotalPoints()
  }, [loadTotalPoints])

  // Token rotation — same pattern as EventTicket.tsx
  useEffect(() => {
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
          'generate-user-qr',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

      let { data, error } = await invokeWithToken(session.access_token)
      if (cancelled) return

      // Retry once with a fresh session if first attempt fails
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
        setSecondsLeft(TOKEN_TTL)
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
  }, [retryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const strokeDashoffset = RECT_CIRCUMFERENCE * (1 - secondsLeft / TOKEN_TTL)
  const ringColor = fetchError
    ? '#EF4444'
    : secondsLeft > 30
      ? 'rgb(var(--color-primary))'
      : '#F8C630'

  const minutesLeft = Math.floor(secondsLeft / 60)
  const secsDisplay = secondsLeft % 60
  const countdownLabel = minutesLeft > 0
    ? `${minutesLeft}m ${secsDisplay}s`
    : `${secondsLeft}s`

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, rgb(var(--color-primary-dark)) 0%, rgb(var(--color-primary)) 100%)' }}>

      {/* Floating back button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05, duration: 0.2 }}
        onClick={() => navigate(-1)}
        whileTap={{ scale: 0.92 }}
        className="fixed top-4 left-4 z-20 flex items-center gap-1.5 text-white/90 bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-full text-sm font-medium border border-white/20"
      >
        <ArrowLeftOutline className="w-4 h-4" />
        Back
      </motion.button>

      <div className="flex flex-col items-center px-5 pt-20 pb-12">

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header strip */}
          <div className="px-6 pt-6 pb-5 text-center" style={{ backgroundColor: 'rgb(var(--color-primary))' }}>
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xl font-black text-white overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user?.full_name ?? ''} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </div>
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1">
              My QR Code
            </p>
            <h2 className="text-white text-[17px] font-bold leading-snug">{user?.full_name}</h2>
            {chapterName && (
              <p className="text-white/70 text-xs mt-1">{chapterName} Chapter</p>
            )}
          </div>

          {/* White body */}
          <div className="bg-white">

            {/* QR section */}
            <div className="flex flex-col items-center pt-6 pb-3 px-6 gap-3">
              <div className="relative w-[240px] h-[240px] flex items-center justify-center">

                {/* SVG countdown border */}
                <svg width={240} height={240} className="absolute pointer-events-none" aria-hidden="true">
                  <rect
                    x={10} y={10}
                    width={RECT_SIZE} height={RECT_SIZE}
                    rx={RECT_RX} ry={RECT_RX}
                    fill="none"
                    stroke="rgba(0,0,0,0.07)"
                    strokeWidth={4}
                  />
                  <rect
                    x={10} y={10}
                    width={RECT_SIZE} height={RECT_SIZE}
                    rx={RECT_RX} ry={RECT_RX}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={RECT_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                  />
                </svg>

                {/* QR container */}
                <div
                  className="p-4 bg-white rounded-2xl shadow-[0_8px_32px_rgba(30,42,86,0.18)]"
                  style={{ opacity: isRefreshing || !token ? 0.4 : 1, transition: 'opacity 0.3s' }}
                >
                  {token ? (
                    <QRCodeSVG
                      value={token}
                      size={172}
                      level="M"
                      fgColor="#1E2A56"
                      bgColor="#FFFFFF"
                    />
                  ) : (
                    <div className="w-[172px] h-[172px] flex items-center justify-center">
                      <div
                        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: 'rgb(var(--color-primary)) transparent transparent transparent' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown / retry */}
              {fetchError ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRetryKey(k => k + 1)}
                  className="flex items-center gap-1.5 text-red text-xs font-semibold px-4 py-1.5 rounded-full border border-red/30 bg-red/5"
                >
                  <RefreshOutline className="w-3 h-3" />
                  Tap to retry
                </motion.button>
              ) : (
                <p
                  className="text-xs font-medium"
                  style={{ color: secondsLeft <= 30 ? '#F8C630' : 'rgb(var(--color-primary))' }}
                >
                  {isRefreshing ? 'Refreshing…' : `Refreshes in ${countdownLabel}`}
                </p>
              )}
            </div>

            {/* Perforated divider */}
            <div className="relative flex items-center mx-0">
              <div className="absolute -left-3 w-6 h-6 rounded-full bg-slate-100" />
              <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-4" />
              <div className="absolute -right-3 w-6 h-6 rounded-full bg-slate-100" />
            </div>

            {/* InfoCircleOutline rows */}
            <div className="px-6 pt-4 pb-6 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Member</span>
                <span className="text-slate-900 font-medium">{user?.full_name ?? '—'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Points</span>
                <span className="flex items-center gap-1 text-gold font-bold">
                  <StarOutline className="w-3 h-3 fill-gold text-gold" />
                  {spendablePoints.toLocaleString()} XP
                </span>
              </div>
              {chapterName && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Chapter</span>
                  <span className="text-slate-900 font-medium">{chapterName}</span>
                </div>
              )}
            </div>

          </div>
        </motion.div>

        {/* Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="flex items-start gap-2 w-full max-w-sm mt-4 bg-white/10 rounded-2xl px-4 py-3"
        >
          <QRCodeOutline className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />
          <p className="text-white/60 text-xs leading-relaxed">
            Show this QR at the venue entrance. Works for your next upcoming registered event at your chapter.
          </p>
        </motion.div>

      </div>
    </div>
  )
}
