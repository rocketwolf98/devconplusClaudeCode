// apps/member/src/pages/notifications/NotificationsInbox.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BellOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNotificationsStore } from '../../stores/useNotificationsStore'
import { formatDate } from '../../lib/dates'
import { staggerContainer, cardItem } from '../../lib/animation'

interface NotificationsInboxProps {
  /** Pass true when rendered inside the organizer layout so the header uses bg-blue instead of bg-primary */
  isOrganizer?: boolean
}

export default function NotificationsInbox({ isOrganizer = false }: NotificationsInboxProps) {
  const navigate = useNavigate()
  const { notifications, markAllRead } = useNotificationsStore()

  // Mark all as read when inbox is opened
  useEffect(() => {
    markAllRead()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className={`${isOrganizer ? 'bg-blue' : 'bg-primary'} px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl`}>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-xl font-bold">Notifications</h1>
        <p className="text-white/60 text-sm mt-0.5">Event announcements from organizers</p>
      </div>

      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 pt-20 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
              <BellOff className="w-9 h-9 text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-700">No announcements yet</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Event updates from organizers will appear here.
            </p>
          </div>
        ) : (
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                variants={cardItem}
                className="bg-white rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                    {n.event_title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDate.compact(n.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{n.message}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
