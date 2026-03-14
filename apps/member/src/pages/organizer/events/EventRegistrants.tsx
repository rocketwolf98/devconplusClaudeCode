import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ClipboardList } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useEventsStore } from '../../../stores/useEventsStore'
import { ApprovalCard, type Registration } from '../../../components/ApprovalCard'
import { fadeUp, staggerContainer, cardItem } from '../../../lib/animation'

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export function OrgEventRegistrants() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events } = useEventsStore()

  const event = events.find((e) => e.id === id)
  const [registrants, setRegistrants] = useState<Registration[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [filter, setFilter]           = useState<FilterStatus>('all')

  // Fetch registrations with joined member profile data
  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    supabase
      .from('event_registrations')
      .select('id, status, registered_at, profiles(full_name, email, school_or_company)')
      .eq('event_id', id)
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
          }
        })
        setRegistrants(mapped)
        setIsLoading(false)
      })
  }, [id, event?.title])

  const handleApprove = async (regId: string) => {
    const qrToken = 'DCN-' + crypto.randomUUID().slice(0, 8).toUpperCase()
    const { error } = await supabase
      .from('event_registrations')
      .update({
        status:        'approved',
        approved_at:   new Date().toISOString(),
        qr_code_token: qrToken,
      })
      .eq('id', regId)
    if (!error) {
      setRegistrants((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: 'approved' as const } : r))
      )
    }
  }

  const handleReject = async (regId: string) => {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'rejected' })
      .eq('id', regId)
    if (!error) {
      setRegistrants((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: 'rejected' as const } : r))
      )
    }
  }

  const handleRevert = async (regId: string) => {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'pending', approved_at: null, qr_code_token: null })
      .eq('id', regId)
    if (!error) {
      setRegistrants((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: 'pending' as const } : r))
      )
    }
  }

  const handleApproveAll = async () => {
    const pending = registrants.filter((r) => r.status === 'pending')
    await Promise.all(pending.map((r) => handleApprove(r.id)))
  }

  const filtered = filter === 'all' ? registrants : registrants.filter((r) => r.status === filter)

  const counts = {
    all:      registrants.length,
    pending:  registrants.filter((r) => r.status === 'pending').length,
    approved: registrants.filter((r) => r.status === 'approved').length,
    rejected: registrants.filter((r) => r.status === 'rejected').length,
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
        <h1 className="text-xl font-bold text-white">Registrants</h1>
        <p className="text-white/60 text-sm mt-0.5">{event?.title ?? 'Event'}</p>
      </div>

      <motion.div
        className="p-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Filter tabs */}
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

        <AnimatePresence>
          {filter === 'pending' && counts.pending > 0 && (
            <motion.button
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleApproveAll}
              className="mb-4 px-4 py-2 bg-green text-white text-sm font-bold rounded-xl hover:bg-green/90 transition-colors flex items-center gap-2"
              whileTap={{ scale: 0.97 }}
            >
              <Check className="w-4 h-4" />
              Approve All Pending ({counts.pending})
            </motion.button>
          )}
        </AnimatePresence>

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
                  {filter === 'all' ? 'No one has registered yet.' : `No ${filter} registrations.`}
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
                    <ApprovalCard
                      registration={reg}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onRevert={handleRevert}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  )
}
