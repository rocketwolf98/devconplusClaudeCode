import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/useAuthStore'
import logoHorizontal from '../../assets/logos/logo-horizontal.svg'

const USERNAME_RE = /^[a-z0-9_]+$/
const ORGANIZER_ROLES = ['chapter_officer', 'hq_admin', 'super_admin']

interface Chapter { id: string; name: string; region: string }

const schema = z.object({
  username:          z.string().min(3, 'Min 3 characters').max(20, 'Max 20 characters').regex(USERNAME_RE, 'Only lowercase letters, numbers, underscores'),
  chapter_id:        z.string().min(1, 'Please select your chapter'),
  school_or_company: z.string().max(100).optional(),
})
type FormData = z.infer<typeof schema>

export default function OAuthProfileComplete() {
  const navigate = useNavigate()
  const { checkUsernameAvailable } = useAuthStore()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    supabase.from('chapters').select('id, name, region').order('name').then(({ data }) => {
      if (data) setChapters(data as Chapter[])
    })
  }, [])

  const handleUsernameChange = useCallback((value: string) => {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    if (!value || value.length < 3 || !USERNAME_RE.test(value)) {
      setUsernameStatus('idle')
      return
    }
    setUsernameStatus('checking')
    usernameTimerRef.current = setTimeout(async () => {
      const available = await checkUsernameAvailable(value)
      setUsernameStatus(available ? 'available' : 'taken')
    }, 400)
  }, [checkUsernameAvailable])

  const onSubmit = async (data: FormData) => {
    if (usernameStatus === 'taken' || usernameStatus === 'checking') {
      setFormError(usernameStatus === 'checking' ? 'Please wait for username check.' : 'Username is already taken.')
      return
    }
    setFormError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/sign-in', { replace: true }); return }

    const userId = session.user.id
    const meta = session.user.user_metadata

    // Upsert — handles both "no profile yet" and "partial profile from trigger"
    const { error } = await supabase.from('profiles').upsert({
      id:                userId,
      full_name:         (meta.full_name as string | undefined) ?? meta.name ?? session.user.email?.split('@')[0] ?? 'User',
      username:          data.username.toLowerCase(),
      email:             session.user.email ?? '',
      chapter_id:        data.chapter_id,
      school_or_company: data.school_or_company || null,
      avatar_url:        (meta.avatar_url as string | undefined) ?? null,
      role:              'member',
      spendable_points:  0,
      lifetime_points:   0,
    }, { onConflict: 'id', ignoreDuplicates: false })

    if (error) {
      setFormError('Something went wrong saving your profile. Please try again.')
      return
    }

    // Initialize store with the now-complete profile
    await useAuthStore.getState().initialize()

    const profile = useAuthStore.getState().user
    if (profile && ORGANIZER_ROLES.includes(profile.role)) {
      navigate('/organizer', { replace: true })
    } else {
      navigate('/home', { replace: true })
    }
  }

  const watchedUsername = watch('username') ?? ''

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      <div className="bg-blue px-6 pt-16 pb-10 text-center">
        <img src={logoHorizontal} alt="DEVCON+" className="h-7 w-auto mx-auto" />
        <p className="text-white/60 mt-3 text-sm">Complete your profile to continue</p>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8 pb-10 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Username */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Username</label>
            <div className="relative">
              <input
                {...register('username', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleUsernameChange(e.target.value),
                })}
                type="text"
                placeholder="e.g. juandelacruz"
                autoCapitalize="none"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
              />
              {watchedUsername.length >= 3 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                  {usernameStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-green" />}
                  {usernameStatus === 'taken' && <XCircle className="w-4 h-4 text-red" />}
                </span>
              )}
            </div>
            {errors.username && <p className="text-red text-xs mt-1">{errors.username.message}</p>}
            {usernameStatus === 'taken' && <p className="text-red text-xs mt-1">Username taken — try another.</p>}
            {usernameStatus === 'available' && <p className="text-green text-xs mt-1">Username available!</p>}
          </div>

          {/* Chapter */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">DEVCON Chapter</label>
            <select
              {...register('chapter_id')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue"
              defaultValue=""
            >
              <option value="" disabled>Select your chapter</option>
              {['Luzon', 'Visayas', 'Mindanao'].map((region) => (
                <optgroup key={region} label={region}>
                  {chapters.filter((c) => c.region === region).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.chapter_id && <p className="text-red text-xs mt-1">{errors.chapter_id.message}</p>}
          </div>

          {/* School / Company (optional) */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              School or Company <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              {...register('school_or_company')}
              type="text"
              placeholder="e.g. UP Diliman"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
          </div>

          {formError && (
            <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2">{formError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking'}
            className="w-full bg-blue text-white font-bold py-4 rounded-2xl disabled:opacity-60 hover:bg-blue-dark transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
