import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { usePointsStore } from '../../stores/usePointsStore'

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { totalPoints } = usePointsStore()

  const initials = user?.full_name
    ?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'

  const menu = [
    { label: 'Edit Profile',  icon: '✏️', path: '/profile/edit'          },
    { label: 'Notifications', icon: '🔔', path: '/profile/notifications' },
    { label: 'Privacy',       icon: '🔒', path: '/profile/privacy'       },
  ]

  return (
    <div>
      <div className="bg-navy px-4 pt-14 pb-8 text-center">
        <div className="w-20 h-20 bg-blue rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
        <h1 className="text-white text-xl font-bold">{user?.full_name}</h1>
        <p className="text-white/60 text-sm">{user?.email}</p>
        <div className="mt-4">
          <p className="text-gold font-bold text-xl">{totalPoints.toLocaleString()}</p>
          <p className="text-white/50 text-xs">Points</p>
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4 space-y-2">
        {menu.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full bg-white rounded-2xl shadow-card px-4 py-4 flex items-center gap-3 text-left"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="flex-1 font-medium text-slate-900 text-sm">{item.label}</span>
            <span className="text-slate-300">›</span>
          </button>
        ))}

        <button
          onClick={() => { signOut(); navigate('/sign-in') }}
          className="w-full bg-red/10 text-red font-semibold py-4 rounded-2xl mt-4"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
