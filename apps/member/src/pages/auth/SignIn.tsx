import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function SignIn() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    await signIn(data.email, data.password)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <div className="bg-gradient-to-b from-navy to-blue px-6 pt-16 pb-10 text-center">
        <h1 className="text-white text-3xl font-bold">DEVCON<span className="text-gold">+</span></h1>
        <p className="text-white/60 mt-1 text-sm">Sign in to your account</p>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue text-white font-bold py-4 rounded-2xl disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/sign-up" className="text-blue font-semibold">Sign Up</Link>
        </p>
      </div>
    </div>
  )
}
