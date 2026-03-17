import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, LogOut, Shield, Star } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { usePointsStore } from '../../stores/usePointsStore'
import { useThemeStore, PROGRAM_THEMES } from '../../stores/useThemeStore'
import ComingSoonModal from '../../components/ComingSoonModal'

const MENU_ITEMS: { label: string; path: string }[] = [
  { label: 'XP History',           path: '/points/history'        },
  { label: 'Edit Profile',         path: '/profile/edit'          },
  { label: 'Notifications',        path: '/profile/notifications' },
  { label: 'Privacy & Security',   path: '/profile/privacy'       },
]

export default function Profile() {
  const navigate = useNavigate()
  const { user, initials, signOut, chapterName } = useAuthStore()
  const { totalPoints } = usePointsStore()
  const { themeId, setTheme } = useThemeStore()
  const [showHelpModal, setShowHelpModal] = useState(false)

  return (
    <div>
      {/* Header */}
      <div className="bg-primary px-4 pt-14 pb-8 rounded-b-3xl text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-black text-white mx-auto mb-3 overflow-hidden">
          {user?.avatar_url ? (
            <>
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (fallback) fallback.style.display = 'block'
                }}
              />
              <span style={{ display: 'none' }}>{initials}</span>
            </>
          ) : (
            initials
          )}
        </div>
        <h1 className="text-xl font-black text-white">{user?.full_name}</h1>
        <p className="text-white/60 text-sm mt-0.5">{user?.email}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
          {chapterName && (
            <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1 text-white">
              {chapterName} Chapter
            </span>
          )}
          <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1 text-white">
            {user?.role === 'hq_admin' ? 'HQ Admin'
              : user?.role === 'super_admin' ? 'Super Admin'
              : user?.role === 'chapter_officer' ? 'Chapter Officer'
              : 'Member'}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-white text-xs font-semibold">
            <Star className="w-3 h-3 fill-gold text-gold" />
            {totalPoints.toLocaleString()} XP
          </span>
        </div>
      </div>

      <div className="bg-slate-50 min-h-screen p-4 space-y-3 pb-8 md:max-w-full md:px-8">

        {/* Program Theme */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-sm font-bold text-slate-900 mb-3">Program Theme</p>
          <div className="grid grid-cols-2 gap-2">
            {PROGRAM_THEMES.map((theme) => {
              const isActive = theme.id === themeId
              return (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: theme.hex }}
                  />
                  <span className="flex-1">{theme.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {MENU_ITEMS.map((item, i) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full px-4 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                i < MENU_ITEMS.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <span className="text-sm font-semibold text-slate-900">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          ))}
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-full px-4 py-4 flex items-center justify-between text-left border-t border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-900">Help & Support</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Officer Portal — only visible to organizer-role users */}
        {user?.role && ['chapter_officer', 'hq_admin', 'super_admin'].includes(user.role) && (
          <button
            onClick={() => navigate('/organizer')}
            className="w-full py-3.5 bg-blue/10 text-blue text-sm font-bold rounded-2xl hover:bg-blue/20 transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Officer Portal
          </button>
        )}

        {/* Sign Out */}
        <button
          onClick={() => { signOut(); navigate('/sign-in') }}
          className="w-full py-3.5 bg-red/10 text-red text-sm font-bold rounded-2xl hover:bg-red/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

      </div>

      {showHelpModal && (
        <ComingSoonModal feature="Help & Support" onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  )
}
