import { useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Gift, QrCode, Briefcase, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/useAuthStore'

const LEFT_TABS = [
  { path: '/home',    label: 'Home',    icon: Home,     end: true },
  { path: '/rewards', label: 'Rewards', icon: Gift,     end: false },
]

const RIGHT_TABS = [
  { path: '/jobs',    label: 'Jobs',    icon: Briefcase, end: false },
  { path: '/profile', label: 'Profile', icon: User,      end: false },
]

export default function MemberLayout() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) navigate('/sign-in', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  if (!user) return null

  return (
    <div className="flex flex-col h-dvh bg-slate-50 overflow-hidden">
      {/* Scrollable page content */}
      <div ref={scrollRef} data-scroll-container className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </div>

      {/* Floating pill bottom nav */}
      <div
        className="fixed bottom-4 left-4 right-4 z-50"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="flex items-center justify-around bg-white/95 backdrop-blur rounded-2xl shadow-primary border border-slate-100 px-2 py-2">

          {/* Left: Home + Rewards */}
          {LEFT_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Center: Events — elevated hero circle */}
          <NavLink
            to="/events"
            className="-mt-6"
            title="Events"
          >
            {({ isActive }) => (
              <motion.div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-primary ${
                  isActive ? 'bg-primary-dark' : 'bg-primary'
                }`}
                style={{ border: '3px solid white' }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <QrCode className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </NavLink>

          {/* Right: Jobs + Profile */}
          {RIGHT_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}

        </div>
      </div>
    </div>
  )
}
