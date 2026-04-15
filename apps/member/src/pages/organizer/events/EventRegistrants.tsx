import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftOutline, CheckCircleOutline, AltArrowDownOutline, ClipboardListOutline, UserSpeakOutline, UsersGroupRoundedOutline } from 'solar-icon-set'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useEventsStore } from '../../../stores/useEventsStore'
import { useOrganizerUser } from '../../../stores/useOrgAuthStore'
import { toast } from 'sonner'
import { ApprovalCard, type Registration } from '../../../components/ApprovalCard'
import { fadeUp, staggerContainer, cardItem } from '../../../lib/animation'
import SendAnnouncementSheet from '../../../components/SendAnnouncementSheet'

interface EmailParams { memberName: string; eventTitle: string; eventDate: string; eventLocation?: string; pointsValue: number; ticketUrl: string }
function buildApprovedEmail({ memberName, eventTitle, eventDate, eventLocation, pointsValue, ticketUrl }: EmailParams): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><style>body{margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.w{max-width:390px;margin:0 auto}.hd{background:#1E2A56;padding:28px 24px;text-align:center;color:#fff;font-size:22px;font-weight:900}.bd{background:#fff;padding:28px 24px}.ft{background:#1E2A56;padding:20px 24px;text-align:center}h2{color:#0F172A;font-size:20px;font-weight:800;margin:0 0 8px}p{color:#334155;font-size:14px;line-height:1.65;margin:0 0 16px}.row{font-size:13px;margin-bottom:10px}.lbl{color:#94A3B8;font-size:12px;margin-right:8px}.val{color:#0F172A;font-weight:600}.badge{display:inline-block;background:#DCFCE7;color:#16A34A;font-weight:700;font-size:13px;padding:4px 12px;border-radius:99px}.cta{display:block;background:#1152D4;color:#fff;font-weight:700;font-size:15px;text-align:center;text-decoration:none;padding:14px 24px;border-radius:14px;margin-top:24px}.ft p{color:rgba(255,255,255,.45);font-size:11px;margin:0}hr{border:none;border-top:1px solid #E2E8F0;margin:20px 0}</style></head><body><div class="w"><div class="hd">DEVCON<span style="color:#EA641D">+</span></div><div class="bd"><h2>You're approved! ✅</h2><p>Hi ${memberName},</p><p>Great news — your registration for <strong>${eventTitle}</strong> has been approved by the organizer.</p><hr/><div class="row"><span class="lbl">Event</span><span class="val">${eventTitle}</span></div><div class="row"><span class="lbl">Date</span><span class="val">${eventDate}</span></div>${eventLocation ? `<div class="row"><span class="lbl">Location</span><span class="val">${eventLocation}</span></div>` : ''}<div class="row"><span class="lbl">Points</span><span class="badge">+${pointsValue} XP on attendance</span></div><hr/><p style="font-size:13px;color:#64748B">Your QR ticket is ready. Show it at the venue entrance to check in.</p><a href="${ticketUrl}" class="cta">View My Ticket</a></div><div class="ft"><p>DEVCON Philippines — Sync. Support. Succeed.</p></div></div></body></html>`
}

// ── Custom form field types ───────────────────────────────────────────────────

type CustomFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'radio'

interface CustomFormField {
  id: string
  label: string
  type: CustomFieldType
  required: boolean
  options: string[]
}

type RegistrantWithResponses = Registration & {
  form_responses?: Record<string, unknown> | null
}

// ── Local component: form responses panel ─────────────────────────────────────

function FormResponsesPanel({
  schema,
  responses,
  isExpanded,
  onToggle,
}: {
  schema: CustomFormField[]
  responses: Record<string, unknown>
  isExpanded: boolean
  onToggle: () => void
}) {
  const answeredCount = schema.filter(f => {
    const v = responses[f.id]
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  }).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-md3-label-md font-bold text-slate-500 hover:text-slate-700 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <ClipboardListOutline className="w-3.5 h-3.5" />
          Registration Responses
          <span className="ml-1 bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
            {answeredCount}/{schema.length}
          </span>
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <AltArrowDownOutline className="w-3.5 h-3.5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
              {schema.map(field => {
                const answer = responses[field.id]
                const isEmpty = answer === undefined || answer === null || answer === '' ||
                  (Array.isArray(answer) && answer.length === 0)
                const display = isEmpty
                  ? <span className="text-slate-300 italic">No answer</span>
                  : <span className="text-slate-800">{Array.isArray(answer) ? answer.join(', ') : String(answer)}</span>
                return (
                  <div key={field.id}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                      {field.label}{field.required ? ' *' : ''}
                    </p>
                    <p className="text-md3-body-md">{display}</p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'
type MainTab = 'registrants' | 'volunteers'

interface VolunteerApplication {
  id: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  profiles: { full_name: string | null } | null
}

// Flower-of-life pattern matching Rewards/Dashboard/Events
const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="0" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="0" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="30" cy="30" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/></svg>`
const PATTERN_BG = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

export function OrgEventRegistrants() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events } = useEventsStore()

  const event = events.find((e) => e.id === id)
  const organizerUser = useOrganizerUser()
  const [registrants, setRegistrants] = useState<RegistrantWithResponses[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [filter, setFilter]           = useState<FilterStatus>('all')
  const [showAnnounce, setShowAnnounce] = useState(false)
  const [mainTab, setMainTab]           = useState<MainTab>('registrants')
  const [volunteers, setVolunteers]     = useState<VolunteerApplication[]>([])
  const [volunteersLoading, setVolunteersLoading] = useState(false)
  const [formSchema, setFormSchema]     = useState<CustomFormField[]>([])
  const [expandedResponseIds, setExpandedResponseIds] = useState<Set<string>>(new Set())

  const toggleResponses = (regId: string) =>
    setExpandedResponseIds(prev => {
      const next = new Set(prev)
      if (next.has(regId)) next.delete(regId)
      else next.add(regId)
      return next
    })

  // Fetch custom_form_schema for this event
  useEffect(() => {
    if (!id) return
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom_form_schema not yet in generated DB types
      const { data } = await (supabase as any)
        .from('events')
        .select('custom_form_schema')
        .eq('id', id)
        .single() as { data: { custom_form_schema: unknown } | null }
      if (Array.isArray(data?.custom_form_schema)) {
        setFormSchema(data.custom_form_schema as CustomFormField[])
      }
    })()
  }, [id])

  // Fetch registrations with joined member profile data + form_responses
  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- form_responses not yet in generated DB types
    ;(supabase as any)
      .from('event_registrations')
      .select('id, status, registered_at, checked_in, form_responses, profiles(full_name, email, school_or_company)')
      .eq('event_id', id)
      .neq('status', 'cancelled')
      .then(({ data }: { data: Array<{
        id: string
        status: string | null
        registered_at: string | null
        checked_in: boolean | null
        form_responses: Record<string, unknown> | null
        profiles: { full_name?: string; email?: string; school_or_company?: string } | null
      }> | null }) => {
        const mapped: RegistrantWithResponses[] = (data ?? []).map((row) => {
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
            checked_in:        row.checked_in ?? false,
            form_responses:    row.form_responses ?? null,
          }
        })
        setRegistrants(mapped)
        setIsLoading(false)
      })
  }, [id, event?.title])

  const fetchVolunteers = async () => {
    if (!id) return
    setVolunteersLoading(true)
    const { data } = await supabase
      .from('volunteer_applications')
      .select('id, reason, status, created_at, profiles(full_name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false })
    setVolunteers((data ?? []) as unknown as VolunteerApplication[])
    setVolunteersLoading(false)
  }

  useEffect(() => {
    if (mainTab === 'volunteers') {
      fetchVolunteers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, id])

  const handleApproveVolunteer = async (appId: string) => {
    if (!organizerUser?.id) return
    await supabase.rpc('approve_volunteer_application' as any, {
      p_application_id: appId,
      p_organizer_id:   organizerUser.id,
    })
    await fetchVolunteers()
  }

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
      // Fire-and-forget approval email
      const reg = registrants.find((r) => r.id === regId)
      if (reg?.member_email) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && event) {
          const eventDate = event.event_date
            ? new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            : 'Date TBA'
          const ticketUrl = `${window.location.origin}/events/${event.slug ?? event.id}/ticket`
          void supabase.functions.invoke('send-email', {
            body: {
              to: reg.member_email,
              subject: `You're approved for ${event.title}!`,
              html: buildApprovedEmail({ memberName: reg.member_name, eventTitle: event.title, eventDate, eventLocation: event.location ?? undefined, pointsValue: event.points_value ?? 100, ticketUrl }),
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        }
      }
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

  const handleCheckIn = async (regId: string) => {
    if (!organizerUser?.id) return
    const { data, error } = await supabase.rpc('manual_checkin', {
      p_registration_id: regId,
      p_organizer_id:    organizerUser.id,
    })
    if (error || !(data as unknown as { success?: boolean })?.success) return
    const result = data as unknown as { success: boolean; member_name: string; points_awarded: number }
    setRegistrants((prev) =>
      prev.map((r) => r.id === regId ? { ...r, checked_in: true } : r)
    )
    toast.success(`${result.member_name} checked in — +${result.points_awarded} pts`)
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
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 flex flex-col pointer-events-none">
        {/* ── Blue Background Container ── */}
        <div 
          className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[24px] pt-14"
          style={{ 
            clipPath: 'ellipse(100% 100% at 50% 0%)',
            backgroundImage: PATTERN_BG,
            backgroundSize: '60px 60px',
            backgroundPosition: 'top center',
            backgroundRepeat: 'repeat'
          }}
        >
          {/* Header Row: Title + Icons */}
          <div className="relative z-10 px-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center active:bg-white/40 transition-colors shadow-sm shrink-0"
              >
                <ArrowLeftOutline className="w-5 h-5" color="white" />
              </button>
              <h1 className="text-white text-[24px] font-semibold font-proxima leading-none tracking-tight">
                Attendees
              </h1>
            </div>
            {event && (
              <button
                onClick={() => setShowAnnounce(true)}
                className="bg-white/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5
                           text-white text-md3-label-md font-bold active:bg-white/30 transition-colors shrink-0"
              >
                <UserSpeakOutline className="w-3.5 h-3.5" color="white" />
                Announce
              </button>
            )}
          </div>
          <div className="px-[76px] pb-4">
            <p className="text-white/70 text-[13px] font-proxima truncate leading-none">
              {event?.title ?? 'Event'}
            </p>
          </div>
        </div>
      </header>

      <motion.div
        className="p-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Main tab switcher: Registrants | Volunteers */}
        <motion.div variants={fadeUp} className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
          {(['registrants', 'volunteers'] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-md3-body-md font-semibold transition-colors capitalize flex items-center gap-1.5 ${
                mainTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'volunteers' && <UsersGroupRoundedOutline className="w-3.5 h-3.5" />}
              {tab === 'registrants' && <ClipboardListOutline className="w-3.5 h-3.5" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {mainTab === 'registrants' ? (
            <motion.div
              key="registrants-panel"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Status filter sub-tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
                {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-md3-body-md font-semibold transition-colors capitalize ${
                      filter === f
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {f} ({counts[f]})
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {filter === 'pending' && counts.pending > 0 && (
                  <motion.button
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={handleApproveAll}
                    className="mb-4 px-4 py-2 bg-green text-white text-md3-body-md font-bold rounded-xl hover:bg-green/90 transition-colors flex items-center gap-2"
                    whileTap={{ scale: 0.97 }}
                  >
                    <CheckCircleOutline className="w-4 h-4" />
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
                        <ClipboardListOutline className="w-7 h-7" color="#94A3B8" />
                      </div>
                      <p className="text-md3-body-lg font-bold text-slate-700">No registrants found</p>
                      <p className="text-md3-body-md text-slate-400 mt-1">
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
                        <motion.div key={reg.id} variants={cardItem} className="space-y-1.5">
                          <ApprovalCard
                            registration={reg}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onRevert={handleRevert}
                            onCheckIn={handleCheckIn}
                          />
                          {formSchema.length > 0 && reg.form_responses && (
                            <FormResponsesPanel
                              schema={formSchema}
                              responses={reg.form_responses}
                              isExpanded={expandedResponseIds.has(reg.id)}
                              onToggle={() => toggleResponses(reg.id)}
                            />
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="volunteers-panel"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {volunteersLoading ? (
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
              ) : volunteers.length === 0 ? (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <UsersGroupRoundedOutline className="w-7 h-7" color="#94A3B8" />
                  </div>
                  <p className="text-md3-body-lg font-bold text-slate-700">No volunteer applications yet.</p>
                  <p className="text-md3-body-md text-slate-400 mt-1">Applications will appear here once submitted.</p>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {volunteers.map((app) => (
                    <motion.div
                      key={app.id}
                      variants={cardItem}
                      className="bg-white rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-md3-body-md font-bold text-slate-900 truncate">
                            {app.profiles?.full_name ?? 'Unknown'}
                          </p>
                          {app.reason && (
                            <p className="text-md3-label-md text-slate-500 mt-1 line-clamp-2">
                              {app.reason}
                            </p>
                          )}
                        </div>
                        <span
                          className={`flex-shrink-0 text-md3-label-md font-semibold rounded-full px-2.5 py-1 ${
                            app.status === 'approved'
                              ? 'bg-green/10 text-green'
                              : app.status === 'rejected'
                              ? 'bg-red/10 text-red'
                              : 'bg-gold/10 text-gold'
                          }`}
                        >
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </div>
                      {app.status === 'pending' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApproveVolunteer(app.id)}
                          className="mt-3 w-full py-2 bg-green text-white text-md3-label-md font-bold rounded-xl hover:bg-green/90 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircleOutline className="w-3.5 h-3.5" />
                          Approve
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {event && (
        <SendAnnouncementSheet
          eventId={event.id}
          eventTitle={event.title}
          isOpen={showAnnounce}
          onClose={() => setShowAnnounce(false)}
        />
      )}
    </div>
  )
}
