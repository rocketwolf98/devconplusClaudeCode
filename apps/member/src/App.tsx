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
import logoHorizontal from './assets/logos/logo-horizontal.svg'
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
      <div className="fixed inset-0 bg-blue flex flex-col items-center justify-center gap-4">
        <img src={logoHorizontal} alt="DEVCON+" className="h-8 w-auto" />
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
