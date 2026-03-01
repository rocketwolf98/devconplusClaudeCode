import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'

const schema = z.object({
  full_name:         z.string().min(2, 'Name required'),
  school_or_company: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name:         user?.full_name ?? '',
      school_or_company: user?.school_or_company ?? '',
    },
  })

  const onSubmit = (_data: FormData) => navigate('/profile')  // mock: no real save

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-blue to-navy px-4 pt-14 pb-6 rounded-b-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/70 text-sm mb-3 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-white text-xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
          <input
            {...register('full_name')}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
          />
          {errors.full_name && <p className="text-red text-xs mt-1">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">School / Company</label>
          <input
            {...register('school_or_company')}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
          />
        </div>

        <button type="submit" className="w-full bg-blue text-white font-bold py-4 rounded-2xl">
          Save Changes
        </button>
      </form>
    </div>
  )
}
