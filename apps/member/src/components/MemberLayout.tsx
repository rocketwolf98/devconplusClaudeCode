import { Outlet, NavLink } from 'react-router-dom'
import { Home, Gift, QrCode, Briefcase, User } from 'lucide-react'

const LEFT_TABS = [
  { path: '/',        label: 'Home',    icon: Home,     end: true },
  { path: '/rewards', label: 'Rewards', icon: Gift,     end: false },
]

const RIGHT_TABS = [
  { path: '/jobs',    label: 'Jobs',    icon: Briefcase, end: false },
  { path: '/profile', label: 'Profile', icon: User,      end: false },
]

export default function MemberLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 max-w-lg mx-auto">
      {/* Scrollable page content — leave room for the bottom nav */}
      <div className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </div>

      {/* Floating pill bottom nav */}
      <div
        className="fixed bottom-4 left-0 right-0 max-w-lg mx-auto px-4 z-50"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="flex items-center justify-around bg-white/95 backdrop-blur rounded-2xl shadow-blue border border-slate-100 px-2 py-2">

          {/* Left: Home + Rewards */}
          {LEFT_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-blue' : 'text-slate-400'
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
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-blue transition-transform hover:scale-105 ${
                  isActive ? 'bg-blue-dark' : 'bg-blue'
                }`}
                style={{ border: '3px solid white' }}
              >
                <QrCode className="w-6 h-6 text-white" />
              </div>
            )}
          </NavLink>

          {/* Right: Jobs + Profile */}
          {RIGHT_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-blue' : 'text-slate-400'
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
