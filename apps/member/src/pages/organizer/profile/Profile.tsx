import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Heart, User } from 'lucide-react'
import { useOrgAuthStore, useOrganizerUser } from '../../../stores/useOrgAuthStore'
import { useAuthStore } from '../../../stores/useAuthStore'
import ComingSoonModal from '../../../components/ComingSoonModal'

const MENU_ITEMS: { label: string; path?: string; modal?: string }[] = [
  { label: 'Edit Profile',       path: '/organizer/profile/edit'          },
  { label: 'Notifications',      path: '/organizer/profile/notifications' },
  { label: 'Privacy & Security', path: '/organizer/profile/privacy'       },
  { label: 'Help & Support',     modal: 'Help & Support'                  },
]

export function OrgProfile() {
  const user = useOrganizerUser()
  const { logout: orgLogout } = useOrgAuthStore()
  const { setOrganizerSession } = useAuthStore()
  const navigate = useNavigate()
  const [activeModal, setActiveModal] = useState<string | null>(null)

  if (!user) return null

  const handleLogout = () => {
    orgLogout()
    setOrganizerSession(false)
    navigate('/sign-in')
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-blue px-4 pt-14 pb-8 rounded-b-3xl text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-black text-white mx-auto mb-3 overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
          ) : (
            user.initials
          )}
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

      <div className="bg-slate-50 min-h-screen p-4 space-y-3 pb-8">

        {/* Settings menu */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {MENU_ITEMS.map((item, i) => (
            <button
              key={item.label}
              onClick={() => item.path ? navigate(item.path) : setActiveModal(item.modal!)}
              className={`w-full px-4 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                i < MENU_ITEMS.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <span className="text-sm font-semibold text-slate-900">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          ))}
        </div>

        {/* Platform info */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Platform</p>
          <p className="text-sm font-semibold text-slate-900">DEVCON+ Organizer Portal v1.0.0</p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red inline" /> for DEVCON Philippines
          </p>
        </div>

        {/* Switch to Member View */}
        <button
          onClick={() => navigate('/home')}
          className="w-full py-3.5 bg-primary/10 text-primary text-sm font-bold rounded-2xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
        >
          <User className="w-4 h-4" />
          Switch to Member View
        </button>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-red/10 text-red text-sm font-bold rounded-2xl hover:bg-red/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

      </div>

      {activeModal && (
        <ComingSoonModal feature={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}
