import { Outlet, NavLink } from 'react-router-dom'

const LEFT_TABS = [
  { path: '/events', label: 'Events', icon: '🎟️' },
  { path: '/jobs', label: 'Jobs', icon: '💼' },
]

const RIGHT_TABS = [
  { path: '/points', label: 'Points', icon: '⭐' },
  { path: '/profile', label: 'Profile', icon: '👤' },
]

export default function MemberLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 max-w-lg mx-auto">
      {/* Scrollable page content — leave room for the 72px bottom nav */}
      <div className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </div>

      {/* Fixed bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-200 z-50"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="flex items-end justify-around h-[72px] px-2 relative">
          {/* Left: Events + Jobs */}
          {LEFT_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 pt-2 pb-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-blue' : 'text-slate-400'
                }`
              }
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}

          {/* Center: Dashboard hero circle — elevated above nav bar */}
          <NavLink
            to="/"
            end
            className="flex-1 flex justify-center items-end pb-2"
            title="Dashboard"
          >
            <div
              className="w-14 h-14 rounded-full bg-blue flex items-center justify-center shadow-blue relative -top-4"
              style={{ border: '3px solid white' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
          </NavLink>

          {/* Right: Points + Profile */}
          {RIGHT_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 pt-2 pb-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-blue' : 'text-slate-400'
                }`
              }
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
