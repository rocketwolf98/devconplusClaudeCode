import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import ComingSoonModal from '../../components/ComingSoonModal'
import logoHorizontal from '../../assets/logos/logo-horizontal.svg'

const schema = z.object({
  full_name:         z.string().min(2, 'Name required'),
  email:             z.string().email('Invalid email'),
  password:          z.string().min(6, 'At least 6 characters'),
  school_or_company: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.84H9v3.48h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

const ORGANIZER_ROLES = ['chapter_officer', 'hq_admin'] as const

function getPostAuthRoute(role: string): string {
  if (role === 'super_admin') return '/admin'
  if (ORGANIZER_ROLES.includes(role as typeof ORGANIZER_ROLES[number])) return '/organizer'
  return '/organizer-code-gate'
}

export default function SignUp() {
  const navigate = useNavigate()
  const { signUp } = useAuthStore()
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setFormError(null)
    try {
      const { emailConfirmationPending } = await signUp(data.email, data.password, data.full_name, data.school_or_company)
      if (emailConfirmationPending) {
        navigate('/email-sent', { state: { email: data.email, type: 'signup' } })
      } else {
        const currentUser = useAuthStore.getState().user
        navigate(currentUser ? getPostAuthRoute(currentUser.role) : '/organizer-code-gate')
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sign-up failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      {/* Gradient header */}
      <div className="bg-blue px-6 pt-16 pb-10 text-center">
        <img src={logoHorizontal} alt="DEVCON+" className="h-7 w-auto mx-auto" />
        <p className="text-white/60 mt-3 text-sm">Create your account</p>
      </div>

      {/* Floating card */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8 pb-10 overflow-y-auto">
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors mb-5 shadow-card"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or email</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
            <input
              {...register('full_name')}
              placeholder="Juan dela Cruz"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {errors.full_name && <p className="text-red text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="juan@devcon.ph"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {errors.email && <p className="text-red text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              School / Company <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              {...register('school_or_company')}
              placeholder="University of Santo Tomas"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
          </div>

          {formError && (
            <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue text-white font-bold py-4 rounded-2xl disabled:opacity-60 hover:bg-blue-dark transition-colors"
          >
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-blue font-semibold">Sign In</Link>
        </p>
      </div>

      {showGoogleModal && (
        <ComingSoonModal
          feature="Google Sign-In"
          onClose={() => setShowGoogleModal(false)}
        />
      )}
    </div>
  )
}
