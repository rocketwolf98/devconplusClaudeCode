import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, AlertTriangle, ClipboardList } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useEventsStore } from '../../../stores/useEventsStore'
import { formatDate } from '../../../lib/dates'
import { ApprovalCard, type Registration } from '../../../components/ApprovalCard'
import { fadeUp, staggerContainer, cardItem } from '../../../lib/animation'

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export function OrgEventSummary() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, fetchEvents, deleteEvent } = useEventsStore()

  const [registrants, setRegistrants] = useState<Registration[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [filter, setFilter]           = useState<FilterStatus>('all')
  const [deleteStep, setDeleteStep]   = useState<0 | 1 | 2>(0)
  const [isDeleting, setIsDeleting]   = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Declared before useEffect so it is in scope inside the fetch closure.
  // (Same pattern as OrgEventRegistrants.tsx line 20.)
  const event = events.find((e) => e.id === id)

  // Guard: load events if store is empty
  useEffect(() => {
    if (events.length === 0) void fetchEvents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch registrants — re-runs if id or event title changes
  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    supabase
      .from('event_registrations')
      .select('id, status, registered_at, checked_in, profiles(full_name, email, school_or_company)')
      .eq('event_id', id)
      .neq('status', 'cancelled')
      .then(({ data }) => {
        const mapped: Registration[] = (data ?? []).map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
          const p = profile as { full_name?: string; email?: string; school_or_company?: string } | null
          return {
            id:                row.id,
            member_name:       p?.full_name ?? 'Unknown',
            member_email:      p?.email ?? '',
            school_or_company: p?.school_or_company ?? '',
            event_title:       event?.title ?? '',
            registered_at:     row.registered_at ?? '',
            status:            row.status as Registration['status'],
            checked_in:        (row.checked_in as boolean | null) ?? false,
          }
        })
        setRegistrants(mapped)
        setIsLoading(false)
      })
  }, [id, event?.title]) // eslint-disable-line react-hooks/exhaustive-deps

  // Not-found fallback
  if (!event) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">Event not found.</p>
      </div>
    )
  }

  // Funnel counts
  const funnel = {
    total:    registrants.length,
    checkedIn: registrants.filter((r) => r.checked_in).length,
    approved: registrants.filter((r) => r.status === 'approved').length,
    pending:  registrants.filter((r) => r.status === 'pending').length,
    rejected: registrants.filter((r) => r.status === 'rejected').length,
  }

  const counts: Record<FilterStatus, number> = {
    all:      registrants.length,
    approved: funnel.approved,
    pending:  funnel.pending,
    rejected: funnel.rejected,
  }

  const filtered = filter === 'all' ? registrants : registrants.filter((r) => r.status === filter)

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
      {/* ── Header ── */}
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
        <p className="text-white/60 text-sm mt-0.5">
          Post-Event Summary
          {event.event_date ? ` • ${formatDate.full(event.event_date)}` : ''}
        </p>
      </div>

      <motion.div
        className="p-4 pb-24"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ── Funnel Stats ── */}
        <motion.div variants={fadeUp} className="mb-6 space-y-3">
          {/* Row 1: Total Registered + Checked In */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Registered', value: funnel.total,    color: 'text-blue' },
              { label: 'Checked In',       value: funnel.checkedIn, color: 'text-green' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
          {/* Row 2: Approved + Pending + Rejected */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Approved', value: funnel.approved, color: 'text-blue' },
              { label: 'Pending',  value: funnel.pending,  color: 'text-yellow-500' },
              { label: 'Rejected', value: funnel.rejected, color: 'text-red' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Filter tabs ── */}
        <motion.div variants={fadeUp} className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
          {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </motion.div>

        {/* ── Attendee list ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-32" />
                    <div className="h-3 bg-slate-100 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-base font-bold text-slate-700">No registrants found</p>
                <p className="text-sm text-slate-400 mt-1">
                  {filter === 'all' ? 'No one registered for this event.' : `No ${filter} registrations.`}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={filter}
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {filtered.map((reg) => (
                  <motion.div key={reg.id} variants={cardItem}>
                    <ApprovalCard registration={reg} readOnly />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Delete confirmation bottom sheets (2-step) ── */}
      <AnimatePresence>
        {deleteStep > 0 && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteStep(0)}
            />

            {deleteStep === 1 && (
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl px-5 pt-4 pb-10"
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

            {deleteStep === 2 && (
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl px-5 pt-4 pb-10"
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
                  <h2 className="text-base font-bold text-slate-900 mb-1">Are you sure?</h2>
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
