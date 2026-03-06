import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Users, KeyRound, CalendarDays, Building2, LayoutDashboard } from 'lucide-react'
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
  const { user } = useAuthStore()
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
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <img src={logoHorizontal} alt="DEVCON+" className="h-6 w-auto" />
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                    ? 'bg-blue/10 text-blue'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium truncate">{user.full_name}</p>
          <p className="text-[10px] text-slate-300 truncate">{user.email}</p>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
