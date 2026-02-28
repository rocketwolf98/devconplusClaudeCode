import { useNavigate } from 'react-router-dom'
import { LogOut, Heart } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'

export function Profile() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-black text-slate-900 mb-6">Profile</h1>

      {/* Profile card */}
      <div className="rounded-2xl p-6 text-white mb-6 bg-gradient-to-br from-blue to-navy">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-black shrink-0">
            {user.initials}
          </div>
          <div>
            <p className="text-xl font-black">{user.full_name}</p>
            <p className="text-sm text-white/70">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-0.5">
                {user.chapter} Chapter
              </span>
              <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-0.5">
                {user.role === 'hq_admin' ? 'HQ Admin' : 'Chapter Officer'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 mb-4">
        {[
          { label: 'Full Name', value: user.full_name },
          { label: 'Email',     value: user.email },
          { label: 'Chapter',   value: `${user.chapter} Chapter` },
          { label: 'Role',      value: user.role === 'hq_admin' ? 'HQ Admin' : 'Chapter Officer' },
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-center px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className="text-sm font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 mb-6">
        <div className="px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Platform</p>
          <p className="text-sm font-semibold text-slate-900">DEVCON+ Organizer Portal v1.0.0</p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red inline" /> for DEVCON Philippines
          </p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 border-2 border-red/30 text-red text-sm font-bold rounded-xl hover:bg-red/5 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  )
}
