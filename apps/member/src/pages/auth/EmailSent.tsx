import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Mail, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import logoHorizontal from '../../assets/logos/logo-horizontal.svg'

interface LocationState {
  email: string
  type: 'signup' | 'reset'
}

const RESEND_COOLDOWN = 60

export default function EmailSent() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const email = state?.email ?? ''
  const type = state?.type ?? 'reset'

  const [cooldown, setCooldown] = useState(0)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleResend = async () => {
    setResendError(null)
    setResendSuccess(false)
    try {
      if (type === 'signup') {
        const { error } = await supabase.auth.resend({ type: 'signup', email })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
      }
      setResendSuccess(true)
      setCooldown(RESEND_COOLDOWN)
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Failed to resend. Try again.')
    }
  }

  const heading = type === 'signup' ? 'Verify Your Email' : 'Check Your Inbox'
  const body = type === 'signup'
    ? 'We sent a confirmation link to your email. Click it to activate your account.'
    : 'We sent a password reset link to your email. Click it to set a new password.'

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      {/* Header */}
      <div className="bg-blue px-6 pt-16 pb-10 text-center">
        <img src={logoHorizontal} alt="DEVCON+" className="h-7 w-auto mx-auto" />
        <p className="text-white/60 mt-3 text-sm">
          {type === 'signup' ? 'One more step' : 'Reset your password'}
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8 pb-10 flex flex-col items-center text-center">
        {/* Mail icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue/10 flex items-center justify-center mb-5">
          <Mail className="w-8 h-8 text-blue" />
        </div>

        <h2 className="text-xl font-black text-slate-900 mb-2">{heading}</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-2">{body}</p>

        {email && (
          <p className="text-sm font-semibold text-slate-700 mb-6 break-all">{email}</p>
        )}

        {/* Resend */}
        {resendSuccess && (
          <p className="text-green text-xs font-medium mb-3">Link resent — check your inbox.</p>
        )}
        {resendError && (
          <p className="text-red text-xs mb-3">{resendError}</p>
        )}

        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="flex items-center gap-2 text-sm font-semibold text-blue disabled:text-slate-400 disabled:cursor-not-allowed transition-colors mb-8"
        >
          <RotateCcw className="w-4 h-4" />
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
        </button>

        <p className="text-sm text-slate-500">
          Wrong email?{' '}
          <Link
            to={type === 'signup' ? '/sign-up' : '/forgot-password'}
            className="text-blue font-semibold"
          >
            {type === 'signup' ? 'Sign up again' : 'Try a different email'}
          </Link>
        </p>

        <p className="text-sm text-slate-500 mt-3">
          <Link to="/sign-in" className="text-blue font-semibold">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
