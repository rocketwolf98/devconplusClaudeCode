import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../stores/useAuthStore'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch {
      setError('Invalid credentials. Please try again.')
    }
  }

  const handleGoogleAuth = () => {
    // TODO: Supabase Google OAuth
    login('org@devcon.ph', 'password').then(() => navigate('/'))
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue flex items-center justify-center text-white font-black text-xl mx-auto mb-4">
            D+
          </div>
          <h1 className="text-2xl font-black text-slate-900">DEVCON+ Organizer</h1>
          <p className="text-sm text-slate-400 mt-1">Chapter Officer & Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors mb-4"
          >
            <span className="text-lg">🔐</span>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="your@devcon.ph"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20"
              />
              {errors.email && (
                <p className="text-xs text-red mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20"
              />
              {errors.password && (
                <p className="text-xs text-red mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <p className="text-xs text-red bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue text-white rounded-xl text-sm font-bold hover:bg-blue-dark transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Only chapter officers and HQ admins can access this portal.
        </p>
      </div>
    </div>
  )
}
