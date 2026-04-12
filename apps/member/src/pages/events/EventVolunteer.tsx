import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftOutline, HeartOutline, CheckCircleOutline, RefreshCircleOutline, CalendarOutline, MapPointOutline } from 'solar-icon-set'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useEventsStore } from '../../stores/useEventsStore'
import { useVolunteerStore } from '../../stores/useVolunteerStore'
import { getEventThemeStyle } from '../../lib/eventTheme'
import { fadeUp } from '../../lib/animation'
import NotFound from '../NotFound'

function VolunteerPageHeader({ event, onBack }: { event: { title: string }; onBack: () => void }) {
  return (
    <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
      >
        <ArrowLeftOutline className="w-5 h-5 text-white" />
      </motion.button>
      <h1 className="text-white text-xl font-bold">Volunteer Application</h1>
      <p className="text-white/60 text-sm mt-1">{event.title}</p>
    </div>
  )
}

const schema = z.object({
  reason: z.string().min(20, 'Please write at least 20 characters'),
  phone_number: z.string().optional(),
  social_media_handle: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function EventVolunteer() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { events } = useEventsStore()
  const { loadApplications, applyToVolunteer, getApplicationByEventId } = useVolunteerStore()

  const event = slug ? events.find((e) => e.slug === slug) : undefined
  const eventId = event?.id
  const existingApp = eventId ? getApplicationByEventId(eventId) : undefined

  useEffect(() => {
    loadApplications()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  if (!event || !eventId) return <NotFound />

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBA'

  // If the user already has an application, show read-only status card
  if (existingApp && !submitted) {
    return (
      <div
        className="min-h-screen bg-slate-50"
        style={getEventThemeStyle(event.devcon_category)}
      >
        <VolunteerPageHeader event={event} onBack={() => navigate(`/events/${slug}`)} />

        <div className="p-4 pb-24">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl p-5 shadow-card space-y-3 text-center"
          >
            <HeartOutline className="w-10 h-10 text-primary mx-auto" />
            <p className="text-slate-700 font-semibold">Application Submitted</p>
            <p className="text-sm text-slate-500">
              Status:{' '}
              <span
                className={
                  existingApp.status === 'approved'
                    ? 'text-green font-semibold'
                    : existingApp.status === 'rejected'
                      ? 'text-red font-semibold'
                      : 'text-yellow-500 font-semibold'
                }
              >
                {existingApp.status.charAt(0).toUpperCase() + existingApp.status.slice(1)}
              </span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null)
    const result = await applyToVolunteer(eventId, {
      reason: values.reason,
      phone_number: values.phone_number || undefined,
      social_media_handle: values.social_media_handle || undefined,
    })
    if (result.success) {
      setSubmitted(true)
    } else {
      setSubmitError(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  // Success state — replace form with confirmation card
  if (submitted) {
    return (
      <div
        className="min-h-screen bg-slate-50"
        style={getEventThemeStyle(event.devcon_category)}
      >
        <VolunteerPageHeader event={event} onBack={() => navigate(`/events/${slug}`)} />

        <div className="p-4 pb-24">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl p-6 shadow-card text-center space-y-4"
          >
            <CheckCircleOutline className="w-14 h-14 text-green mx-auto" />
            <div>
              <h2 className="text-slate-900 text-lg font-bold">Application Submitted!</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                We'll review your application and notify you soon.
              </p>
            </div>
            <div className="bg-primary/10 rounded-xl px-4 py-3">
              <p className="text-primary text-sm font-semibold">
                +{event.points_value + event.volunteer_points} pts when approved!
              </p>
              <p className="text-primary/60 text-xs mt-0.5">
                {event.points_value} attendance + {event.volunteer_points} volunteer bonus
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/events/${slug}`)}
              className="w-full bg-primary text-white font-bold py-4 rounded-2xl mt-2"
            >
              Back to Event
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={getEventThemeStyle(event.devcon_category)}
    >
      <VolunteerPageHeader event={event} onBack={() => navigate(-1)} />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="p-4 pb-24 space-y-4"
      >
        {/* Event info card — read-only */}
        <div className="bg-white rounded-2xl p-4 shadow-card space-y-2">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-32 object-cover rounded-xl mb-3"
            />
          ) : (
            <div className="w-full h-32 bg-primary/10 rounded-xl mb-3 flex items-center justify-center">
              <CalendarOutline className="w-10 h-10 text-primary/30" />
            </div>
          )}
          <h2 className="text-slate-900 font-bold text-base">{event.title}</h2>
          <p className="text-xs text-slate-400">{dateStr}</p>
          {event.location && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPointOutline className="w-3 h-3 shrink-0" />
              {event.location}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Reason */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Why do you want to volunteer? <span className="text-red">*</span>
            </label>
            <textarea
              {...register('reason')}
              rows={4}
              placeholder="Tell us why you'd like to volunteer for this event (at least 20 characters)…"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            {errors.reason && (
              <p className="text-red text-xs mt-1">{errors.reason.message}</p>
            )}
          </div>

          {/* PhoneOutline number */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              PhoneOutline Number <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <input
              {...register('phone_number')}
              type="tel"
              placeholder="+63 900 000 0000"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Social media handle */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Social Media Handle <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <input
              {...register('social_media_handle')}
              type="text"
              placeholder="@username or profile URL"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Submit error */}
          {submitError && (
            <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          {/* Submit button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCircleOutline className="w-5 h-5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <HeartOutline className="w-5 h-5" />
                Submit Volunteer Application
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
