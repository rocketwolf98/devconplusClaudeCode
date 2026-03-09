import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Users, KeyRound, CalendarDays, Building2, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import logoHorizontal from '../assets/logos/logo-horizontal.svg'

const NAV_ITEMS = [
  { path: '/admin',          label: 'Dashboard', Icon: LayoutDashboard, end: true  },
  { path: '/admin/users',    label: 'Users',      Icon: Users,          end: false },
  { path: '/admin/org-codes',label: 'Org Codes',  Icon: KeyRound,       end: false },
  { path: '/admin/events',   label: 'Events',     Icon: CalendarDays,   end: false },
  { path: '/admin/chapters', label: 'Chapters',   Icon: Building2,      end: false },
]

export default function AdminLayout() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/sign-in', { replace: true })
    } else if (user.role !== 'super_admin') {
      navigate('/home', { replace: true })
    }
  }, [user, navigate])

  if (!user || user.role !== 'super_admin') return null

  return (
    <div className="flex h-screen bg-slate-100 font-sans p-4 gap-4">
      {/* Floating sidebar */}
      <aside className="w-56 shrink-0 bg-blue rounded-2xl shadow-card flex flex-col overflow-hidden">
        <div className="px-5 py-5 border-b border-white/10">
          <img src={logoHorizontal} alt="DEVCON+" className="h-6 w-auto" />
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-white/50">
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-[11px] text-white/90 font-semibold truncate">{user.full_name}</p>
          <p className="text-[10px] text-white/50 truncate">{user.email}</p>
          <button
            onClick={() => { void signOut(); navigate('/sign-in') }}
            className="mt-3 flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area — floating card */}
      <main className="flex-1 bg-white rounded-2xl shadow-card border border-slate-100 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
