import { useEffect, useState } from 'react'
import { MapPin, Trash2, Zap, Plus, Pencil, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import type { Event } from '@devcon-plus/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface EventWithChapter extends Event {
  chapters?: { name: string } | null
}

// ── Zod schema ─────────────────────────────────────────────────────────────────

const eventSchema = z
  .object({
    chapter_id: z.string().min(1, 'Select a chapter'),
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    location: z.string().min(2, 'Location is required'),
    event_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().optional(),
    category: z.enum([
      'tech_talk',
      'hackathon',
      'workshop',
      'brown_bag',
      'summit',
      'social',
      'networking',
    ]),
    visibility: z.enum(['public', 'unlisted', 'draft']).default('public'),
    is_free: z.boolean().default(true),
    ticket_price_php: z.number({ coerce: true }).int().min(0).default(0),
    capacity: z.number({ coerce: true }).int().positive().optional(),
    points_value: z
      .number({ coerce: true })
      .min(50, 'Minimum 50 XP')
      .max(1000, 'Maximum 1000 XP'),
    requires_approval: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.end_date && data.event_date && data.end_date <= data.event_date) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_date'],
        message: 'End time must be after start time',
      })
    }
  })

type EventFormData = z.infer<typeof eventSchema>

// ── Constants ──────────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20'
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5'

const CATEGORY_OPTIONS: { value: EventFormData['category']; label: string }[] = [
  { value: 'tech_talk',  label: 'Tech Talk'  },
  { value: 'hackathon',  label: 'Hackathon'  },
  { value: 'workshop',   label: 'Workshop'   },
  { value: 'brown_bag',  label: 'Brown Bag'  },
  { value: 'summit',     label: 'Summit'     },
  { value: 'social',     label: 'Social'     },
  { value: 'networking', label: 'Networking' },
]

const VISIBILITY_OPTIONS: { value: EventFormData['visibility']; label: string }[] = [
  { value: 'public',   label: 'Public'   },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'draft',    label: 'Draft'    },
]

// ── SlideOver form props ───────────────────────────────────────────────────────

interface SlideOverFormProps {
  mode: 'create' | 'edit'
  event?: EventWithChapter
  chapters: { id: string; name: string }[]
  onClose: () => void
  onSaved: (event: EventWithChapter) => void
}

// ── EventSlideOverForm ─────────────────────────────────────────────────────────

function EventSlideOverForm({ mode, event, chapters, onClose, onSaved }: SlideOverFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          chapter_id:        event.chapter_id,
          title:             event.title,
          description:       event.description ?? '',
          location:          event.location ?? '',
          event_date:        event.event_date?.slice(0, 16) ?? '',
          end_date:          event.end_date?.slice(0, 16) ?? '',
          category:          event.category ?? 'tech_talk',
          visibility:        event.visibility ?? 'public',
          is_free:           event.is_free ?? true,
          ticket_price_php:  event.ticket_price_php ?? 0,
          capacity:          event.capacity ?? undefined,
          points_value:      event.points_value ?? 200,
          requires_approval: event.requires_approval ?? false,
        }
      : {
          points_value:      200,
          requires_approval: false,
          is_free:           true,
          ticket_price_php:  0,
          visibility:        'public',
        },
  })

  const isFree = watch('is_free')

  const onSubmit = async (data: EventFormData) => {
    setSubmitError(null)
    try {
      if (mode === 'create') {
        const { data: result, error: dbErr } = await supabase
          .from('events')
          .insert({
            ...data,
            end_date:          data.end_date ?? null,
            capacity:          data.capacity ?? null,
            status:            'upcoming',
            tags:              [],
            cover_image_url:   null,
            created_by:        null,
            is_featured:       false,
            is_promoted:       false,
          })
          .select('*, chapters(name)')
          .single()
        if (dbErr) { setSubmitError(dbErr.message); return }
        onSaved(result as EventWithChapter)
      } else {
        const { data: result, error: dbErr } = await supabase
          .from('events')
          .update({
            ...data,
            end_date:  data.end_date ?? null,
            capacity:  data.capacity ?? null,
          })
          .eq('id', event!.id)
          .select('*, chapters(name)')
          .single()
        if (dbErr) { setSubmitError(dbErr.message); return }
        onSaved(result as EventWithChapter)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {mode === 'create' ? 'Create Event' : 'Edit Event'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === 'create' ? 'Add a new event to any chapter' : 'Update event details'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable form body */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* ── Chapter (admin-only) ── */}
        <div>
          <label className={labelClass}>
            Chapter <span className="text-red normal-case">*</span>
          </label>
          <select {...register('chapter_id')} className={inputClass}>
            <option value="">Select chapter…</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.chapter_id && (
            <p className="text-xs text-red mt-1">{errors.chapter_id.message}</p>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4 mt-4">
          {/* ── Title ── */}
          <div className="mb-4">
            <label className={labelClass}>Event Title <span className="text-red normal-case">*</span></label>
            <input
              {...register('title')}
              className={inputClass}
              placeholder="e.g. DEVCON Summit Manila 2026"
            />
            {errors.title && (
              <p className="text-xs text-red mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* ── Description ── */}
          <div>
            <label className={labelClass}>Description <span className="text-red normal-case">*</span></label>
            <textarea
              {...register('description')}
              rows={4}
              className={`${inputClass} resize-none`}
              placeholder="What is this event about?"
            />
            {errors.description && (
              <p className="text-xs text-red mt-1">{errors.description.message}</p>
            )}
          </div>
        </div>

        {/* ── Category ── */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <label className={labelClass}>
            Category <span className="text-red normal-case">*</span>
          </label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      field.value === opt.value
                        ? 'bg-blue text-white border-blue'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue hover:text-blue'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.category && (
            <p className="text-xs text-red mt-1">{errors.category.message}</p>
          )}
        </div>

        {/* ── Location ── */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <label className={labelClass}>Location <span className="text-red normal-case">*</span></label>
          <input
            {...register('location')}
            className={inputClass}
            placeholder="Venue or Online"
          />
          {errors.location && (
            <p className="text-xs text-red mt-1">{errors.location.message}</p>
          )}
        </div>

        {/* ── Dates ── */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Date & Time</label>
              <input
                {...register('event_date')}
                type="datetime-local"
                className={inputClass}
              />
              {errors.event_date && (
                <p className="text-xs text-red mt-1">{errors.event_date.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>End Date & Time</label>
              <input
                {...register('end_date')}
                type="datetime-local"
                className={inputClass}
              />
              {errors.end_date && (
                <p className="text-xs text-red mt-1">{errors.end_date.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Visibility ── */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <label className={labelClass}>Visibility</label>
          <Controller
            control={control}
            name="visibility"
            render={({ field }) => (
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      field.value === opt.value
                        ? 'bg-blue text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {/* ── Requires Approval ── */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
            <input
              {...register('requires_approval')}
              type="checkbox"
              id="requires_approval_admin"
              className="w-4 h-4 accent-blue rounded"
            />
            <div>
              <label
                htmlFor="requires_approval_admin"
                className="text-sm font-semibold text-slate-900 cursor-pointer"
              >
                Require Registration Approval
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Manually approve each registration before members receive their QR ticket.
              </p>
            </div>
          </div>
        </div>

        {/* ── Ticket Price ── */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <label className={labelClass}>Ticket Price</label>
          <div className="flex gap-3">
            <Controller
              control={control}
              name="is_free"
              render={({ field }) => (
                <>
                  <button
                    type="button"
                    onClick={() => field.onChange(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      field.value
                        ? 'bg-blue text-white border-blue'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue hover:text-blue'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      !field.value
                        ? 'bg-blue text-white border-blue'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue hover:text-blue'
                    }`}
                  >
                    Paid
                  </button>
                </>
              )}
            />
          </div>

          {!isFree && (
            <div className="mt-3">
              <label className={labelClass}>Price (PHP)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                  ₱
                </span>
                <input
                  {...register('ticket_price_php')}
                  type="number"
                  min={1}
                  step={1}
                  className={`${inputClass} pl-8`}
                  placeholder="0"
                />
              </div>
              {errors.ticket_price_php && (
                <p className="text-xs text-red mt-1">{errors.ticket_price_php.message}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Capacity ── */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <label className={labelClass}>
            Capacity{' '}
            <span className="text-slate-300 normal-case font-normal">optional</span>
          </label>
          <input
            {...register('capacity')}
            type="number"
            min={1}
            step={1}
            className={inputClass}
            placeholder="Unlimited"
          />
          {errors.capacity && (
            <p className="text-xs text-red mt-1">{errors.capacity.message}</p>
          )}
        </div>

        {/* ── XP Points Value ── */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <label className={labelClass}>XP Points Value</label>
          <input
            {...register('points_value')}
            type="number"
            className={inputClass}
            min={50}
            max={1000}
            step={50}
          />
          {errors.points_value && (
            <p className="text-xs text-red mt-1">{errors.points_value.message}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Members earn this many XP when checked in at the event.
          </p>
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="text-xs text-red bg-red/5 border border-red/20 rounded-xl px-3 py-2">
            {submitError}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors disabled:opacity-60"
          >
            {isSubmitting
              ? mode === 'create' ? 'Creating…' : 'Saving…'
              : mode === 'create' ? 'Create Event' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── AdminEvents ────────────────────────────────────────────────────────────────

export default function AdminEvents() {
  const [events, setEvents] = useState<EventWithChapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [slideOver, setSlideOver] = useState<{ mode: 'create' | 'edit'; event?: EventWithChapter } | null>(null)
  const [chapters, setChapters] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const [eventsResult, chaptersResult] = await Promise.all([
        supabase
          .from('events')
          .select('*, chapters(name)')
          .order('event_date', { ascending: false }),
        supabase
          .from('chapters')
          .select('id, name')
          .order('name'),
      ])
      if (eventsResult.error) {
        setError(eventsResult.error.message)
        setIsLoading(false)
        return
      }
      setEvents((eventsResult.data ?? []) as EventWithChapter[])
      setChapters((chaptersResult.data ?? []) as { id: string; name: string }[])
      setIsLoading(false)
    }
    void load()
  }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)
    // Delete registrations first to avoid FK constraint violation
    const { error: regErr } = await supabase.from('event_registrations').delete().eq('event_id', id)
    if (regErr) { setError(regErr.message); setDeletingId(null); setConfirmDeleteId(null); return }
    const { error: dbErr } = await supabase.from('events').delete().eq('id', id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (dbErr) { setError(dbErr.message); return }
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">Events</h1>
          <p className="text-sm text-slate-500">View, create, and remove events across all chapters</p>
        </div>
        <button
          onClick={() => setSlideOver({ mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {error && (
        <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading events…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Chapter</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">XP</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{event.title}</p>
                    {event.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {event.location}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{event.chapters?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'TBA'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue/80 bg-blue/10 px-2 py-0.5 rounded-full">
                      <Zap className="w-3 h-3" />
                      {event.points_value}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      event.status === 'upcoming' ? 'bg-blue/10 text-blue'
                      : event.status === 'ongoing' ? 'bg-green/10 text-green'
                      : 'bg-slate-100 text-slate-500'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDeleteId === event.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-slate-500">Sure?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void handleDelete(event.id)}
                          disabled={deletingId === event.id}
                          className="text-xs px-2 py-1 rounded-lg bg-red text-white disabled:opacity-50"
                        >
                          {deletingId === event.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSlideOver({ mode: 'edit', event })}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-blue/10 hover:text-blue transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(event.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red/10 hover:text-red transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && (
            <p className="text-center py-10 text-slate-400 text-sm">No events found.</p>
          )}
        </div>
      )}

      {/* Slide-over panel */}
      <AnimatePresence>
        {slideOver && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSlideOver(null)}
              className="fixed inset-0 bg-black/20 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <EventSlideOverForm
                mode={slideOver.mode}
                event={slideOver.event}
                chapters={chapters}
                onClose={() => setSlideOver(null)}
                onSaved={(savedEvent) => {
                  if (slideOver.mode === 'create') {
                    setEvents((prev) => [savedEvent, ...prev])
                  } else {
                    setEvents((prev) => prev.map((e) => e.id === savedEvent.id ? savedEvent : e))
                  }
                  setSlideOver(null)
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
