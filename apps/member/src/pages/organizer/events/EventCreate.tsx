import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fadeUp, staggerContainer } from '../../../lib/animation'
import { useEventsStore } from '../../../stores/useEventsStore'
import { useAuthStore } from '../../../stores/useAuthStore'

const schema = z.object({
  title:             z.string().min(3, 'Title must be at least 3 characters'),
  description:       z.string().min(10, 'Description must be at least 10 characters'),
  location:          z.string().min(2, 'Location is required'),
  event_date:        z.string().min(1, 'Date is required'),
  points_value:      z.number({ coerce: true }).min(50, 'Minimum 50 XP').max(1000, 'Maximum 1000 XP'),
  requires_approval: z.boolean(),
})

type FormData = z.infer<typeof schema>

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20'
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5'

export function OrgEventCreate() {
  const navigate = useNavigate()
  const { createEvent } = useEventsStore()
  const { user } = useAuthStore()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      points_value:      200,
      requires_approval: false,
    },
  })

  const onSubmit = async (data: FormData) => {
    if (!user?.chapter_id) {
      setSubmitError('Your account is not linked to a chapter. Contact an admin.')
      return
    }
    setSubmitError(null)
    try {
      await createEvent({
        title:             data.title,
        description:       data.description,
        location:          data.location,
        event_date:        data.event_date,
        points_value:      data.points_value,
        requires_approval: data.requires_approval,
        chapter_id:        user.chapter_id,
        created_by:        user.id,
      })
      navigate('/organizer/events')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create event. Please try again.')
    }
  }

  return (
    <div>
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Create Event</h1>
        <p className="text-white/60 text-sm mt-0.5">Fill in the details for your chapter event.</p>
      </div>

      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 space-y-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <label className={labelClass}>Event Title</label>
          <input
            {...register('title')}
            className={inputClass}
            placeholder="e.g. DEVCON Summit Manila 2026"
          />
          {errors.title && <p className="text-xs text-red mt-1">{errors.title.message}</p>}
        </motion.div>

        <motion.div variants={fadeUp}>
          <label className={labelClass}>Description</label>
          <textarea
            {...register('description')}
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="What is this event about?"
          />
          {errors.description && <p className="text-xs text-red mt-1">{errors.description.message}</p>}
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Location</label>
            <input
              {...register('location')}
              className={inputClass}
              placeholder="Venue or Online"
            />
            {errors.location && <p className="text-xs text-red mt-1">{errors.location.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Date & Time</label>
            <input
              {...register('event_date')}
              type="datetime-local"
              className={inputClass}
            />
            {errors.event_date && <p className="text-xs text-red mt-1">{errors.event_date.message}</p>}
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <label className={labelClass}>XP Points Value</label>
          <input
            {...register('points_value')}
            type="number"
            className={inputClass}
            min={50}
            max={1000}
            step={50}
          />
          {errors.points_value && <p className="text-xs text-red mt-1">{errors.points_value.message}</p>}
          <p className="text-xs text-slate-400 mt-1">Members earn this many XP when checked in at the event.</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-4"
        >
          <input
            {...register('requires_approval')}
            type="checkbox"
            id="requires_approval"
            className="w-4 h-4 accent-blue rounded"
          />
          <div>
            <label htmlFor="requires_approval" className="text-sm font-semibold text-slate-900 cursor-pointer">
              Require Registration Approval
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              If checked, you must manually approve each registration before members receive their QR ticket.
            </p>
          </div>
        </motion.div>

        {submitError && (
          <motion.p variants={fadeUp} className="text-xs text-red bg-red/5 border border-red/20 rounded-xl px-3 py-2">
            {submitError}
          </motion.p>
        )}

        <motion.div variants={fadeUp} className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create Event'}
          </button>
        </motion.div>
      </motion.form>
    </div>
  )
}
