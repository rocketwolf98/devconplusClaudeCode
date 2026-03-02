import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Camera } from 'lucide-react'
import { useOrgAuthStore } from '../../../stores/useOrgAuthStore'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
})
type FormData = z.infer<typeof schema>

export function OrgProfileEdit() {
  const navigate = useNavigate()
  const { user, updateProfile } = useOrgAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url ?? null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: user?.full_name ?? '' },
  })

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (data: FormData) => {
    await new Promise((r) => setTimeout(r, 300))
    updateProfile({
      full_name: data.full_name,
      ...(avatarPreview ? { avatar_url: avatarPreview } : {}),
    })
    navigate('/organizer/profile')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">

        {/* Avatar picker */}
        <div className="flex justify-center pt-2 pb-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-primary">{user?.initials}</span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* Email — read only */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
          <input
            value={user?.email ?? ''}
            readOnly
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-100 text-slate-400 cursor-not-allowed"
          />
        </div>

        {/* Full Name */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
          <input
            {...register('full_name')}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.full_name && <p className="text-red text-xs mt-1">{errors.full_name.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white font-bold py-4 rounded-2xl disabled:opacity-60 transition-opacity"
        >
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </button>

      </form>
    </div>
  )
}
