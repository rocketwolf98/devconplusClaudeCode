import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CupFirstOutline, CheckCircleOutline, AltArrowRightOutline, DownloadOutline, LogoutOutline, ShieldOutline, StarOutline } from 'solar-icon-set'
import { useAuthStore, ORGANIZER_ROLES } from '../../stores/useAuthStore'
import type { OrganizerRole } from '../../stores/useAuthStore'
import { usePointsStore } from '../../stores/usePointsStore'
import { useThemeStore, PROGRAM_THEMES } from '../../stores/useThemeStore'
import { ROLE_DISPLAY_NAMES } from '../../lib/constants'
import ComingSoonModal from '../../components/ComingSoonModal'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const MENU_ITEMS: { label: string; path: string }[] = [
  { label: 'My QR Code',           path: '/qr'                    },
  { label: 'XP History',           path: '/points/history'        },
  { label: 'Edit Profile',         path: '/profile/edit'          },
  { label: 'Notifications',        path: '/profile/notifications' },
  { label: 'Privacy & Security',   path: '/profile/privacy'       },
]

// Flower-of-life pattern matching Rewards/Dashboard/Events
const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="0" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="0" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="30" cy="30" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/></svg>`
const PATTERN_BG = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

export default function Profile() {
  const navigate = useNavigate()
  const { user, initials, signOut, chapterName } = useAuthStore()
  const { spendablePoints, prestigeUnlocked, loadTotalPoints } = usePointsStore()
  const { themeId, setTheme } = useThemeStore()
  const [showHelpModal, setShowHelpModal] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    loadTotalPoints()
  }, [loadTotalPoints])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleAddToHomeScreen() {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt()
      await deferredPrompt.current.userChoice
      deferredPrompt.current = null
      setCanInstall(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 flex flex-col pointer-events-none">
        {/* ── Blue Background Container ── */}
        <div 
          className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[40px] pt-14 text-center"
          style={{ 
            clipPath: 'ellipse(100% 100% at 50% 0%)',
            backgroundImage: PATTERN_BG,
            backgroundSize: '60px 60px',
            backgroundPosition: 'top center',
            backgroundRepeat: 'repeat'
          }}
        >
          <div className="relative z-10">
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
            <h1 className="text-xl font-bold text-white font-proxima tracking-tight">{user?.full_name}</h1>
            <p className="text-white/70 text-sm font-proxima mt-0.5">{user?.email}</p>
            
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center px-4">
              {chapterName && (
                <span className="text-[10px] font-bold bg-white/20 border border-white/20 rounded-full px-3 py-1 text-white uppercase tracking-wider backdrop-blur-sm">
                  {chapterName} Chapter
                </span>
              )}
              <span className="text-[10px] font-bold bg-white/20 border border-white/20 rounded-full px-3 py-1 text-white uppercase tracking-wider backdrop-blur-sm">
                {ROLE_DISPLAY_NAMES[user?.role ?? 'member']}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/20 border border-white/20 rounded-full px-3 py-1 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                <StarOutline className="w-3 h-3" color="#F8C630" />
                {spendablePoints.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-[25px] pt-4 space-y-3 pb-24 md:max-w-4xl md:mx-auto">

        {/* Theme */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-sm font-bold text-slate-900 mb-3">Theme</p>
          <div className="flex gap-3">
            {PROGRAM_THEMES.map((theme) => {
              const isActive = theme.id === themeId
              return (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: theme.hex,
                    boxShadow: isActive ? `0 0 0 2px white, 0 0 0 4px ${theme.hex}` : 'none',
                  }}
                >
                  {isActive && <CheckCircleOutline className="w-4 h-4" color="white" />}
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
              <AltArrowRightOutline className="w-4 h-4" color="#CBD5E1" />
            </button>
          ))}
          {!isInStandaloneMode && (canInstall || isIos) && (
            <button
              onClick={canInstall ? handleAddToHomeScreen : undefined}
              className="w-full px-4 py-4 flex items-center justify-between text-left border-t border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DownloadOutline className="w-4 h-4" color="rgb(var(--color-primary))" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">Add to HomeOutline Screen</p>
                  {isIos && !canInstall && (
                    <p className="text-xs text-slate-400 mt-0.5">Tap Share → "Add to HomeOutline Screen"</p>
                  )}
                </div>
              </div>
              <AltArrowRightOutline className="w-4 h-4" color="#CBD5E1" />
            </button>
          )}
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-full px-4 py-4 flex items-center justify-between text-left border-t border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-900">Help & Support</span>
            <AltArrowRightOutline className="w-4 h-4" color="#CBD5E1" />
          </button>
        </div>

        {/* Officer Portal — only visible to organizer-role users */}
        {user?.role && ORGANIZER_ROLES.includes(user.role as OrganizerRole) && (
          <button
            onClick={() => navigate('/organizer')}
            className="w-full py-3.5 bg-blue/10 text-blue text-sm font-bold rounded-2xl hover:bg-blue/20 transition-colors flex items-center justify-center gap-2"
          >
            <ShieldOutline className="w-4 h-4" />
            Officer Portal
          </button>
        )}

        {/* Sign Out */}
        <button
          onClick={() => { signOut(); navigate('/sign-in') }}
          className="w-full py-3.5 bg-red/10 text-red text-sm font-bold rounded-2xl hover:bg-red/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogoutOutline className="w-4 h-4" />
          Sign Out
        </button>

      </div>

      {showHelpModal && (
        <ComingSoonModal feature="Help & Support" onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  )
}
