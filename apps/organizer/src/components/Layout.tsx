import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, ScanLine, User, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'

const LEFT_TABS: { path: string; label: string; Icon: LucideIcon; end: boolean }[] = [
  { path: '/',       label: 'Home',   Icon: LayoutDashboard, end: true  },
  { path: '/events', label: 'Events', Icon: CalendarDays,    end: false },
]

const RIGHT_TABS: { path: string; label: string; Icon: LucideIcon; end: boolean }[] = [
  { path: '/profile', label: 'Profile', Icon: User, end: false },
]

export function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  if (!user) {
    navigate('/login')
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-50 overflow-hidden">
      {/* Top header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue flex items-center justify-center text-white font-black text-sm shrink-0">
            D+
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 leading-none">DEVCON+</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Organizer Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-blue text-xs font-bold shrink-0">
            {user.initials}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red transition-colors px-2 py-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Floating pill bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4">
        <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-blue flex items-center px-2 py-2 max-w-lg mx-auto">
          {/* Left tabs */}
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
            <NavLink to="/scan">
              {({ isActive }) => (
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center -mt-6 shadow-blue transition-colors ${isActive ? 'bg-navy' : 'bg-blue'}`}>
                  <ScanLine className="w-6 h-6 text-white" />
                </div>
              )}
            </NavLink>
          </div>

          {/* Right tabs */}
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
