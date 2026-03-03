import { useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, CalendarDays, ScanLine, Gift, User } from 'lucide-react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'

const LEFT_TABS: { path: string; label: string; Icon: LucideIcon; end: boolean }[] = [
  { path: '/organizer',        label: 'Home',   Icon: Home,         end: true  },
  { path: '/organizer/events', label: 'Events', Icon: CalendarDays, end: false },
]

const RIGHT_TABS: { path: string; label: string; Icon: LucideIcon; end: boolean }[] = [
  { path: '/organizer/rewards', label: 'Rewards', Icon: Gift, end: false },
  { path: '/organizer/profile', label: 'Profile', Icon: User, end: false },
]

export default function OrganizerLayout() {
  const { isOrganizerSession } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const scrollRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isOrganizerSession) {
      navigate('/sign-in', { replace: true })
    }
  }, [isOrganizerSession, navigate])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  if (!isOrganizerSession) return null

  return (
    <div className="flex flex-col h-dvh bg-slate-50 overflow-hidden">
      <main ref={scrollRef} className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Floating pill bottom nav — Home | Events | ●Scan● | Rewards | Profile */}
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="flex items-center justify-around bg-white/95 backdrop-blur rounded-2xl shadow-card border border-slate-100 px-2 py-2">

          {/* Left: Home, Events */}
          {LEFT_TABS.map(({ path, label, Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                  isActive ? 'text-blue' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Center hero — Scanner */}
          <NavLink to="/organizer/scan" className="-mt-6" title="Scan">
            {({ isActive }) => (
              <motion.div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-card transition-colors ${
                  isActive ? 'bg-navy' : 'bg-blue'
                }`}
                style={{ border: '3px solid white' }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <ScanLine className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </NavLink>

          {/* Right: Rewards, Profile */}
          {RIGHT_TABS.map(({ path, label, Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                  isActive ? 'text-blue' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}

        </div>
      </div>
    </div>
  )
}
