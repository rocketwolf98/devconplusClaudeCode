import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import logoVertical from '../../assets/logos/logo-vertical.svg'
import { useAuthStore } from '../../stores/useAuthStore'

export default function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => {
      const { user, isInitialized } = useAuthStore.getState()
      // App.tsx gates the RouterProvider on isInitialized, so this is always true here.
      // Guard is kept as a safety net in case that render gate is later removed.
      // Organizers are also members — always land on /home by default.
      const dest = (isInitialized && user) ? '/home' : '/onboarding'
      navigate(dest, { replace: true })
    }, 2600)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="h-screen bg-blue flex flex-col items-center justify-center">
      <motion.img
        src={logoVertical}
        alt="DEVCON+"
        className="w-32 h-auto"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      />
      <motion.p
        className="text-white/40 text-xs tracking-[0.2em] uppercase mt-6"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        Sync. Support. Succeed.
      </motion.p>
    </div>
  )
}
