import { useNavigate } from 'react-router-dom'
import { LogOut, Heart } from 'lucide-react'
import { useOrgAuthStore } from '../../../stores/useOrgAuthStore'
import { useAuthStore } from '../../../stores/useAuthStore'

export function OrgProfile() {
  const { user, logout: orgLogout } = useOrgAuthStore()
  const { setOrganizerSession } = useAuthStore()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = () => {
    orgLogout()
    setOrganizerSession(false)
    navigate('/sign-in')
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue to-navy px-4 pt-14 pb-8 rounded-b-3xl text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-black text-white mx-auto mb-3">
          {user.initials}
        </div>
        <h1 className="text-xl font-black text-white">{user.full_name}</h1>
        <p className="text-white/60 text-sm mt-0.5">{user.email}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
          <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1 text-white">
            {user.chapter} Chapter
          </span>
          <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1 text-white">
            {user.role === 'hq_admin' ? 'HQ Admin' : 'Chapter Officer'}
          </span>
        </div>
      </div>

      <div className="bg-slate-50 p-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Platform</p>
          <p className="text-sm font-semibold text-slate-900">DEVCON+ Organizer Portal v1.0.0</p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red inline" /> for DEVCON Philippines
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-red/10 text-red text-sm font-bold rounded-2xl hover:bg-red/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
