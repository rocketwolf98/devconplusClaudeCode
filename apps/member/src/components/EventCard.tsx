import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Event } from '@devcon-plus/supabase'
import PromotedBadge from './PromotedBadge'
import StatusPill from './StatusPill'

function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const navigate = useNavigate()
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBA'

  return (
    <motion.button
      onClick={() => navigate(`/events/${event.slug}`)}
      className="w-full bg-white rounded-2xl shadow-card text-left relative overflow-hidden"
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {event.is_promoted && (
        <div className="absolute top-3 right-3 z-10">
          <PromotedBadge />
        </div>
      )}
      {event.cover_image_url ? (
        <img
          src={event.cover_image_url}
          alt={event.title}
          className={`w-full object-cover ${compact ? 'h-28' : 'h-36'}`}
        />
      ) : (
        <div className={`w-full bg-primary flex items-center justify-center ${compact ? 'h-28' : 'h-36'}`}>
          <CalendarDays className="w-12 h-12 text-white/20" />
        </div>
      )}
      <div className="p-4 pt-3">
        <p className="text-xs text-slate-400 mb-0.5">{dateStr}</p>
        <p className="font-semibold text-slate-900 text-sm leading-tight mb-2 pr-12">{event.title}</p>
        <div className="flex items-center gap-2">
          <StatusPill status={event.status as 'upcoming' | 'ongoing' | 'past'} />
          <span className="text-xs text-primary font-semibold">+{event.points_value} pts</span>
        </div>
      </div>
    </motion.button>
  )
}

export default memo(EventCard)
