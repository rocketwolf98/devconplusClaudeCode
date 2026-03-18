// apps/member/src/pages/notifications/NotificationsInbox.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BellOff, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationsStore } from '../../stores/useNotificationsStore'
import { formatDate } from '../../lib/dates'
import { cardItem } from '../../lib/animation'

interface NotificationsInboxProps {
  /** Pass true when rendered inside the organizer layout so the header uses bg-blue instead of bg-primary */
  isOrganizer?: boolean
}

export default function NotificationsInbox({ isOrganizer = false }: NotificationsInboxProps) {
  const navigate = useNavigate()
  const { notifications, markAllRead, dismiss, clearAll } = useNotificationsStore()

  // Mark all as read when inbox is opened
  useEffect(() => {
    markAllRead()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className={`${isOrganizer ? 'bg-blue' : 'bg-primary'} px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl`}>
        <motion.button
          onClick={() => navigate(-1)}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Notifications</h1>
            <p className="text-white/60 text-sm mt-0.5">Event announcements from organizers</p>
          </div>
          {notifications.length > 0 && (
            <motion.button
              onClick={clearAll}
              whileTap={{ scale: 0.95 }}
              aria-label="Clear all notifications"
              className="text-xs text-white/70 active:text-white/50 pb-0.5"
            >
              Clear all
            </motion.button>
          )}
        </div>
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
          <AnimatePresence mode="popLayout">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                variants={cardItem}
                initial="hidden"
                animate="visible"
                exit={{ x: 40, opacity: 0, transition: { duration: 0.2 } }}
                className="relative bg-white rounded-2xl border border-slate-100 p-4 mb-3"
              >
                <motion.button
                  onClick={() => dismiss(n.id)}
                  whileTap={{ scale: 0.95 }}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-slate-300 active:text-slate-500"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
                <div className="flex items-center justify-between mb-2 pr-6">
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
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
