import { useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, ScanLine, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'

const LEFT_TABS: { path: string; label: string; Icon: LucideIcon; end: boolean }[] = [
  { path: '/organizer', label: 'Home', Icon: Home, end: true },
]

const RIGHT_TABS: { path: string; label: string; Icon: LucideIcon; end: boolean }[] = [
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

      {/* Floating pill bottom nav — Home | ●Scan● | Profile */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4">
        <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-blue flex items-center px-2 py-2">
          {/* Left: Home */}
          {LEFT_TABS.map(({ path, label, Icon, end }) => (
            <NavLink key={path} to={path} end={end} className="flex-1">
              {({ isActive }) => (
                <div className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${isActive ? 'text-blue' : 'text-slate-400'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{label}</span>
                </div>
              )}
            </NavLink>
          ))}

          {/* Center hero — Scan */}
          <div className="flex-1 flex justify-center">
            <NavLink to="/organizer/scan">
              {({ isActive }) => (
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center -mt-6 shadow-blue transition-colors ${isActive ? 'bg-navy' : 'bg-blue'}`}
                  style={{ border: '3px solid white' }}
                >
                  <ScanLine className="w-6 h-6 text-white" />
                </div>
              )}
            </NavLink>
          </div>

          {/* Right: Profile */}
          {RIGHT_TABS.map(({ path, label, Icon, end }) => (
            <NavLink key={path} to={path} end={end} className="flex-1">
              {({ isActive }) => (
                <div className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${isActive ? 'text-blue' : 'text-slate-400'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
