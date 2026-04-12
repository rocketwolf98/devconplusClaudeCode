import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircleOutline, CloseCircleOutline } from 'solar-icon-set'
import { supabase } from '../../lib/supabase'
import logoHorizontal from '../../assets/logos/logo-horizontal.svg'

type Status = 'verifying' | 'confirmed' | 'error'

export default function EmailConfirm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = (searchParams.get('type') ?? 'signup') as 'signup' | 'email'

    function onConfirmed() {
      setStatus('confirmed')
      setTimeout(() => navigate('/organizer-code-gate'), 2000)
    }

    function onFailed(msg?: string) {
      setErrorMsg(msg ?? 'Link expired or already used. Please sign up again.')
      setStatus('error')
    }

    if (tokenHash) {
      // PKCE / OTP flow — token_hash is a query param, must be verified explicitly
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type })
        .then(({ error }) => {
          if (error) onFailed(error.message)
          else onConfirmed()
        })
      return
    }

    // Implicit flow — detectSessionInUrl:true has already exchanged the hash fragment.
    // CheckCircleOutline for an immediate session; otherwise wait for SIGNED_IN event.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { onConfirmed(); return }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          subscription.unsubscribe()
          clearTimeout(timeout)
          onConfirmed()
        }
      })

      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        onFailed()
      }, 8000)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      <div className="bg-blue px-6 pt-16 pb-10 text-center">
        <img src={logoHorizontal} alt="DEVCON+" className="h-7 w-auto mx-auto" />
        <p className="text-white/60 mt-3 text-sm">Email Confirmation</p>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8 pb-10 flex flex-col items-center text-center">

        {status === 'verifying' && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-6 h-6 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Confirming your email…</p>
          </div>
        )}

        {status === 'confirmed' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-green/10 flex items-center justify-center mb-5 mt-4">
              <CheckCircleOutline className="w-8 h-8 text-green" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Email Confirmed!</h2>
            <p className="text-sm text-slate-500">Your account is ready. Redirecting you now…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red/10 flex items-center justify-center mb-5 mt-4">
              <CloseCircleOutline className="w-8 h-8 text-red" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Confirmation Failed</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs">{errorMsg}</p>
            <Link
              to="/sign-up"
              className="w-full bg-blue text-white font-bold py-4 rounded-2xl text-center block"
            >
              Sign Up Again
            </Link>
            <Link to="/sign-in" className="text-blue font-semibold text-sm mt-4 block">
              Back to Sign In
            </Link>
          </>
        )}

      </div>
    </div>
  )
}
