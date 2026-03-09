import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Zap, Trash2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEventsStore } from '../../../stores/useEventsStore'
import { fadeUp, staggerContainer, cardItem } from '../../../lib/animation'

export function OrgEventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, fetchEvents, deleteEvent } = useEventsStore()
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0) // 0=hidden, 1=first confirm, 2=final confirm
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (events.length === 0) void fetchEvents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const event = events.find((e) => e.id === id)
  if (!event) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">Event not found.</p>
      </div>
    )
  }

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'TBA'

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteEvent(event.id)
      navigate('/organizer/events', { replace: true })
    } catch {
      setDeleteError('Failed to delete event. Please try again.')
      setIsDeleting(false)
    }
  }


  return (
    <div>
      <div className="bg-blue px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setDeleteStep(1)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-red/40 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
        <h1 className="text-xl font-bold text-white">{event.title}</h1>
        <p className="text-white/60 text-sm mt-0.5 capitalize">{event.status}</p>
      </div>

      <motion.div
        className="p-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Banner */}
        <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden mb-6">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-48 bg-blue flex items-center justify-center">
              <CalendarDays className="w-16 h-16 text-white/20" />
            </div>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div variants={staggerContainer} className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Registrations', value: 0, color: 'text-blue' },
            { label: 'Pending',       value: 0, color: 'text-yellow-500' },
            { label: 'Checked In',    value: 0, color: 'text-green' },
          ].map(({ label, value, color }) => (
            <motion.div
              key={label}
              variants={cardItem}
              className="bg-white rounded-xl border border-slate-200 p-4 text-center"
            >
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Detail card */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs font-semibold text-blue bg-blue/10 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {event.points_value} XP
            </span>
            {event.requires_approval && (
              <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-full">
                Approval Required
              </span>
            )}
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex gap-3 text-sm">
              <span className="text-slate-400 w-24 shrink-0">Date</span>
              <span className="text-slate-700 font-medium">{formattedDate}</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-slate-400 w-24 shrink-0">Location</span>
              <span className="text-slate-700 font-medium">{event.location ?? 'TBA'}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">About</p>
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
          </div>
        </motion.div>

        <motion.button
          variants={fadeUp}
          onClick={() => navigate(`/organizer/events/${event.id}/registrants`)}
          className="w-full py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          View Registrants
        </motion.button>
      </motion.div>

      {/* ── Delete confirmation bottom sheets (2-step) ── */}
      <AnimatePresence>
        {deleteStep > 0 && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteStep(0)}
            />

            {/* Step 1 — confirm intent */}
            {deleteStep === 1 && (
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-[45] bg-white rounded-t-3xl px-5 pt-4 pb-28"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-red" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mb-1">Delete Event?</h2>
                  <p className="text-sm text-slate-500">
                    You are about to delete{' '}
                    <span className="font-semibold text-slate-700">"{event.title}"</span>.
                    This will also permanently remove all registrations for this event.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStep(0)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 py-3 rounded-xl bg-red/10 text-red text-sm font-bold"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — final confirmation */}
            {deleteStep === 2 && (
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-[45] bg-white rounded-t-3xl px-5 pt-4 pb-28"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-red" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mb-1">Are you Sure?</h2>
                  <p className="text-sm text-slate-500">
                    All registrations for this event will be permanently deleted along with the event itself.{' '}
                    <span className="font-semibold text-red">This cannot be undone.</span>
                  </p>
                  {deleteError && (
                    <p className="mt-3 text-sm text-red font-semibold">{deleteError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStep(0)}
                    disabled={isDeleting}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-3 rounded-xl bg-red text-white text-sm font-bold disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete Everything'}
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
