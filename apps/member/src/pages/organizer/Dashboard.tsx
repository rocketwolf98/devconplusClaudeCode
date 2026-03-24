import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Bell, Plus, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrgBanner } from '../../components/OrgBanner'
import { ApprovalCard, type Registration } from '../../components/ApprovalCard'
import { VolunteerApprovalCard } from '../../components/VolunteerApprovalCard'
import { useOrganizerUser } from '../../stores/useOrgAuthStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useEventsStore } from '../../stores/useEventsStore'
import { useOrgVolunteerStore } from '../../stores/useOrgVolunteerStore'
import { supabase } from '../../lib/supabase'
import { fadeUp, staggerContainer, cardItem } from '../../lib/animation'

type TabId = 'approvals' | 'volunteers'

export function OrgDashboard() {
  const user = useOrganizerUser()
  const { user: profile } = useAuthStore()
  const { events, fetchEvents } = useEventsStore()
  const {
    applications: volunteerApps,
    loading: volunteerLoading,
    error: volunteerError,
    approveApplication,
    rejectApplication,
    revertApplication,
    loadApplications: loadVolunteerApps,
  } = useOrgVolunteerStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('approvals')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [membersCount, setMembersCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const chapterId = profile?.chapter_id ?? null

  useEffect(() => {
    void fetchEvents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chapterId) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      setIsLoading(true)

      // Fetch pending registrations for this chapter's events
      const { data: regData } = await supabase
        .from('event_registrations')
        .select(`
          id,
          status,
          registered_at,
          events!inner(id, title, chapter_id),
          profiles(full_name, email, school_or_company)
        `)
        .eq('status', 'pending')
        .eq('events.chapter_id', chapterId)

      const mapped: Registration[] = (regData ?? []).map((row) => {
        const ev = Array.isArray(row.events) ? row.events[0] : row.events
        const p  = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const evObj = ev as { id?: string; title?: string } | null
        const pObj  = p  as { full_name?: string; email?: string; school_or_company?: string } | null
        return {
          id:                row.id,
          member_name:       pObj?.full_name ?? 'Unknown',
          member_email:      pObj?.email ?? '',
          school_or_company: pObj?.school_or_company ?? '',
          event_title:       evObj?.title ?? '',
          registered_at:     row.registered_at ?? '',
          status:            row.status as Registration['status'],
        }
      })
      setRegistrations(mapped)

      // Fetch count of members in this chapter
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId)
      setMembersCount(count ?? 0)

      setIsLoading(false)
    }

    void loadData()
    void loadVolunteerApps(chapterId)
  }, [chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null

  const chapterEvents = events.filter((e) => e.chapter_id === chapterId)
  const pending = registrations.filter((r) => r.status === 'pending')
  const pendingVolunteers = volunteerApps.filter((a) => a.status === 'pending')

  const stats = [
    { label: 'Events',  value: chapterEvents.length },
    { label: 'Members', value: membersCount },
    { label: 'Pending', value: pending.length + pendingVolunteers.length },
  ]

  const handleApprove = async (id: string) => {
    const qrToken = 'DCN-' + crypto.randomUUID().slice(0, 8).toUpperCase()
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'approved', approved_at: new Date().toISOString(), qr_code_token: qrToken })
      .eq('id', id)
    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r))
      )
    }
  }

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r))
      )
    }
  }

  const handleRevert = async (id: string) => {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'pending', approved_at: null, qr_code_token: null })
      .eq('id', id)
    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'pending' as const } : r))
      )
    }
  }

  return (
    <div>
      <div className="bg-blue px-4 pt-12 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <div className="flex justify-end mb-3">
          <button
            onClick={() => navigate('/organizer/notifications')}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30 transition-colors"
          >
            <Bell className="w-4 h-4 text-white" />
          </button>
        </div>

        <OrgBanner
          chapterName={user.chapter}
          role={user.role === 'hq_admin' ? 'HQ Admin' : 'Chapter Officer'}
          stats={stats}
        />

        <button
          onClick={() => navigate('/organizer/events/create')}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-white/20 text-white text-sm font-bold rounded-xl active:bg-white/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      <motion.div
        className="p-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="flex gap-1 mt-2 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {(['approvals', 'volunteers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'approvals'
                ? `Approvals${pending.length > 0 ? ` (${pending.length})` : ''}`
                : `Volunteers${pendingVolunteers.length > 0 ? ` (${pendingVolunteers.length})` : ''}`}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'approvals' && (
            <motion.div
              key="approvals"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
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
              ) : pending.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7 text-green" />
                  </div>
                  <p className="text-base font-bold text-slate-700">All caught up!</p>
                  <p className="text-sm text-slate-400 mt-1">No pending registrations right now.</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  <p className="text-sm text-slate-500 mb-2">
                    {pending.length} registration{pending.length !== 1 ? 's' : ''} awaiting approval
                  </p>
                  {registrations.map((reg) => (
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
            </motion.div>
          )}

          {activeTab === 'volunteers' && (
            <motion.div
              key="volunteers"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {volunteerError && (
                <div className="bg-red/5 border border-red/20 rounded-xl px-4 py-3 mb-3">
                  <p className="text-xs text-red">{volunteerError}</p>
                </div>
              )}
              {volunteerLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-100 rounded w-32" />
                          <div className="h-3 bg-slate-100 rounded w-48" />
                          <div className="h-3 bg-slate-100 rounded w-40" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : volunteerApps.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue/10 flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-7 h-7 text-blue" />
                  </div>
                  <p className="text-base font-bold text-slate-700">No volunteer applications yet.</p>
                  <p className="text-sm text-slate-400 mt-1">Applications will appear here when members apply.</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {pendingVolunteers.length > 0 && (
                    <p className="text-sm text-slate-500 mb-2">
                      {pendingVolunteers.length} application{pendingVolunteers.length !== 1 ? 's' : ''} awaiting review
                    </p>
                  )}
                  {volunteerApps.map((app) => (
                    <motion.div key={app.id} variants={cardItem}>
                      <VolunteerApprovalCard
                        application={app}
                        onApprove={(id) => void approveApplication(id)}
                        onReject={(id) => void rejectApplication(id)}
                        onRevert={(id) => void revertApplication(id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
