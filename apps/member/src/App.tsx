import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import { router } from './router'
import { useThemeStore, PROGRAM_THEMES } from './stores/useThemeStore'
import { useAuthStore } from './stores/useAuthStore'
import { useEventsStore } from './stores/useEventsStore'
import { useJobsStore } from './stores/useJobsStore'
import { useNewsStore } from './stores/useNewsStore'
import logoVertical from './assets/logos/logo-vertical.svg'
import AnimatedDice from './components/AnimatedDice'

const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
  <circle cx="0"  cy="0"  r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
  <circle cx="60" cy="0"  r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
  <circle cx="0"  cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
  <circle cx="60" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
  <circle cx="30" cy="30" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
</svg>`

const PATTERN_STYLE: React.CSSProperties = {
  backgroundColor: '#1152d4',
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`,
  backgroundSize: '60px 60px',
  backgroundRepeat: 'repeat',
}

export default function App() {
  const { themeId } = useThemeStore()
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    const allClasses = PROGRAM_THEMES.map((t) => t.cssClass)
    document.documentElement.classList.remove(...allClasses)
    const theme = PROGRAM_THEMES.find((t) => t.id === themeId)
    if (theme) document.documentElement.classList.add(theme.cssClass)
  }, [themeId])

  useEffect(() => {
    // Kick off auth init AND public data fetches concurrently.
    // events/jobs/news have public RLS (SELECT USING true) — no auth required.
    // By the time the auth waterfall finishes and the router renders /home,
    // these stores are already populated, so the dashboard feels instant.
    initialize()
    void useEventsStore.getState().fetchEvents()
    void useJobsStore.getState().fetchJobs()
    void useNewsStore.getState().fetchNews()
  }, [initialize])

  // Block render until session is restored — prevents a flash redirect to /sign-in
  if (!isInitialized) {
    return (
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={PATTERN_STYLE}
      >
        {/* Logo — centered in remaining space */}
        <div className="flex-1 flex items-center justify-center">
          <img src={logoVertical} alt="DEVCON+" className="w-28 h-auto" />
        </div>
        {/* Dice at bottom — same placement as SplashScreen */}
        <div className="flex flex-col items-center gap-3 pb-16">
          <AnimatedDice />
          <p className="text-white/70 text-[13px] tracking-tight">
            Hang tight! DEVCON+ will load shortly...
          </p>
        </div>
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        offset={96}
        toastOptions={{ style: { borderRadius: '9999px' } }}
      />
    </MotionConfig>
  )
}
