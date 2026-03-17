import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import logoHorizontal from '../../assets/logos/logo-horizontal.svg'

export default function OrganizerCodeGate() {
  const navigate = useNavigate()
  const { user, initialize, setOrganizerSession } = useAuthStore()
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  const handleAccessPortal = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setError('Please enter your organizer code.'); return }
    if (!user) { setError('Session expired. Please sign in again.'); return }

    setLoading(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('organizer_codes')
      .select('chapter_id, assigned_role')
      .eq('code', trimmed)
      .eq('is_active', true)
      .single()

    if (dbError || !data) {
      setError('Invalid organizer code. Please check and try again.')
      setLoading(false)
      return
    }

    // Update profile role + chapter assignment in DB
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role:       data.assigned_role,
        chapter_id: data.chapter_id,
      })
      .eq('id', user.id)

    if (updateError) {
      setError('Could not update profile. Please try again.')
      setLoading(false)
      return
    }

    // Re-fetch updated profile then send to member home
    await initialize()
    navigate('/home')
  }

  const handleContinueAsMember = () => {
    setOrganizerSession(false)
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      {/* Gradient header */}
      <div className="bg-blue px-6 pt-16 pb-10 text-center">
        <img src={logoHorizontal} alt="DEVCON+" className="h-7 w-auto mx-auto" />
        <p className="text-white/70 mt-3 text-sm">Welcome, {firstName}!</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8 pb-32 overflow-y-auto">
        <h2 className="text-lg font-black text-slate-900 mb-1">Are you a Chapter Officer?</h2>
        <p className="text-sm text-slate-500 mb-6">
          Enter your organizer code to access the officer portal, or continue as a member.
        </p>

        <div className="space-y-3">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleAccessPortal()}
            placeholder="e.g. DCN-ABC-1234"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue uppercase tracking-wider"
          />
          {error && <p className="text-red text-xs">{error}</p>}

          <button
            type="button"
            onClick={handleAccessPortal}
            disabled={loading}
            className="w-full bg-navy text-white font-bold py-4 rounded-2xl disabled:opacity-60 hover:bg-blue transition-colors"
          >
            {loading ? 'Verifying…' : 'Access Officer Portal'}
          </button>
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleContinueAsMember}
          className="w-full border border-slate-200 bg-white text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-colors"
        >
          Continue as Member
        </button>

        <p className="text-center text-xs text-slate-400 mt-5">
          Organizer codes are issued by your chapter lead.
        </p>
      </div>
    </div>
  )
}
