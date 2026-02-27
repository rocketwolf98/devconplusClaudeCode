import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

const NAV_ITEMS = [
  { to: '/', icon: '📊', label: 'Home', end: true },
  { to: '/events', icon: '🎟️', label: 'Events', end: false },
  { to: '/scan', icon: '📷', label: null, end: false }, // center hero
  { to: '/profile', icon: '👤', label: 'Profile', end: false },
]

export function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  if (!user) {
    navigate('/login')
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (to: string, end: boolean) => {
    if (end) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F8FAFC', overflow: 'hidden' }}>
      {/* Top header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: '#3B82F6', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 13,
          }}>
            D+
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>DEVCON+</p>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Organizer Portal</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(59,130,246,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3B82F6', fontSize: 11, fontWeight: 700,
          }}>
            {user.initials}
          </div>
          <button
            onClick={handleLogout}
            style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <Outlet />
      </main>

      {/* Bottom nav — mirrors member app CustomTabBar pattern */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#ffffff',
        borderTop: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center',
        paddingTop: 10, paddingBottom: 10,
        zIndex: 20,
      }}>
        {NAV_ITEMS.map((item, index) => {
          const active = isActive(item.to, item.end)
          const isCenter = index === 2

          if (isCenter) {
            return (
              <div key={item.to} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <NavLink to={item.to} style={{ textDecoration: 'none' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 26,
                    background: active ? '#1E2A4A' : '#3B82F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: -20,
                    boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                  }}>
                    <span style={{ fontSize: 22 }}>{item.icon}</span>
                  </div>
                </NavLink>
              </div>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none' }}
            >
              <span style={{ fontSize: 20, lineHeight: '24px' }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#3B82F6' : '#94A3B8' }}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
