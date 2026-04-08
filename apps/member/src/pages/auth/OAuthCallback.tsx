import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ORGANIZER_ROLES = ['chapter_officer', 'hq_admin', 'super_admin']

export default function OAuthCallback() {
  const navigate = useNavigate()
  const navigated = useRef(false)

  useEffect(() => {
    async function redirect(userId: string) {
      if (navigated.current) return
      navigated.current = true

      const { data: profile } = await supabase
        .from('profiles')
        .select('chapter_id, username, role')
        .eq('id', userId)
        .maybeSingle()

      if (!profile || !profile.chapter_id || !profile.username) {
        navigate('/oauth-profile-complete', { replace: true })
      } else if (ORGANIZER_ROLES.includes(profile.role ?? '')) {
        navigate('/organizer', { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
    }

    // Listen for SIGNED_IN — fired when Supabase processes the OAuth tokens from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        void redirect(session.user.id)
      }
    })

    // Fallback: if the session was already parsed before the listener registered
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) void redirect(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-blue/10 flex items-center justify-center mx-auto animate-pulse">
          <svg width="24" height="24" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.84H9v3.48h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
        </div>
        <p className="text-slate-500 text-sm font-medium">Signing you in…</p>
      </div>
    </div>
  )
}
