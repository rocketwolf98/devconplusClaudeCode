import { useEffect, useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { AltArrowRightOutline, LogoutOutline, UserOutline, CalendarOutline, MapPointOutline } from 'solar-icon-set'
import { motion } from 'framer-motion'
import { useOrgAuthStore, useOrganizerUser } from '../../../stores/useOrgAuthStore'
import { useAuthStore } from '../../../stores/useAuthStore'
import { ROLE_DISPLAY_NAMES } from '../../../lib/constants'
import { useEventsStore } from '../../../stores/useEventsStore'
import ComingSoonModal from '../../../components/ComingSoonModal'
import { staggerContainer, cardItem } from '../../../lib/animation'

const MENU_ITEMS: { label: string; icon?: ComponentType<{ className?: string }>; path?: string; modal?: string }[] = [
  { label: 'Edit Profile',          path: '/organizer/profile/edit'           },
  { label: 'Manage Co-Organizers',  path: '/organizer/profile/co-organizers' },
  { label: 'Notifications',         path: '/organizer/profile/notifications'  },
  { label: 'Privacy & Security',    path: '/organizer/profile/privacy'        },
  { label: 'Help & Support',        modal: 'Help & Support'                   },
]

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  upcoming: { bg: 'bg-blue/10',    text: 'text-blue',       label: 'Upcoming' },
  ongoing:  { bg: 'bg-green/10',   text: 'text-green',      label: 'Ongoing'  },
  past:     { bg: 'bg-slate-100',  text: 'text-slate-500',  label: 'Past'     },
}

export function OrgProfile() {
  const user = useOrganizerUser()
  const { logout: orgLogout } = useOrgAuthStore()
  const { user: profile, setOrganizerSession } = useAuthStore()
  const { events, fetchEvents } = useEventsStore()
  const navigate = useNavigate()
  const [activeModal, setActiveModal] = useState<string | null>(null)

  useEffect(() => {
    if (events.length === 0) void fetchEvents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null

  const handleLogout = () => {
    orgLogout()
    setOrganizerSession(false)
    navigate('/sign-in')
  }

  // Events for this chapter, sorted newest first, capped at 5
  const chapterEvents = events
    .filter((e) => e.chapter_id === profile?.chapter_id)
    .sort((a, b) => new Date(b.event_date ?? 0).getTime() - new Date(a.event_date ?? 0).getTime())
    .slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div className="bg-blue px-4 pt-14 pb-8 rounded-b-3xl text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-black text-white mx-auto mb-3 overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
          ) : (
            user.initials
          )}
        </div>
        <h1 className="text-xl font-black text-white">{user.full_name}</h1>
        <p className="text-white/60 text-sm mt-0.5">{user.email}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
          <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1 text-white">
            {user.chapter} Chapter
          </span>
          <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1 text-white">
            {ROLE_DISPLAY_NAMES[user.role] ?? 'Chapter Officer'}
          </span>
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4 space-y-3 pb-8">

        {/* Event History */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-bold text-slate-900">Event History</p>
            <button
              onClick={() => navigate('/organizer/events')}
              className="text-xs font-semibold text-blue"
            >
              View all
            </button>
          </div>

          {chapterEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <CalendarOutline className="w-5 h-5" color="#CBD5E1" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No events yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Events you create will appear here.</p>
            </div>
          ) : (
            <motion.div
              className="divide-y divide-slate-50"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {chapterEvents.map((event) => {
                const style = STATUS_STYLES[event.status] ?? STATUS_STYLES.past
                const dateStr = event.event_date
                  ? new Date(event.event_date).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })
                  : 'TBA'

                return (
                  <motion.button
                    key={event.id}
                    variants={cardItem}
                    onClick={() => navigate(`/organizer/events/${event.id}`)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center shrink-0">
                      <CalendarOutline className="w-5 h-5" color="#1152D4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-400">{dateStr}</p>
                        {event.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-0.5 truncate">
                            <MapPointOutline className="w-2.5 h-2.5 shrink-0" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* Settings menu */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {MENU_ITEMS.map((item, i) => (
            <button
              key={item.label}
              onClick={() => item.path ? navigate(item.path) : setActiveModal(item.modal!)}
              className={`w-full px-4 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                i < MENU_ITEMS.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {item.icon && <item.icon className="w-4 h-4 text-slate-400" />}
                {item.label}
              </span>
              <AltArrowRightOutline className="w-4 h-4" color="#CBD5E1" />
            </button>
          ))}
        </div>

        {/* Switch to Member View */}
        <button
          onClick={() => navigate('/home')}
          className="w-full py-3.5 bg-primary/10 text-primary text-sm font-bold rounded-2xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
        >
          <UserOutline className="w-4 h-4" />
          Switch to Member View
        </button>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-red/10 text-red text-sm font-bold rounded-2xl hover:bg-red/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogoutOutline className="w-4 h-4" />
          Sign Out
        </button>

      </div>

      {activeModal && (
        <ComingSoonModal feature={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}
