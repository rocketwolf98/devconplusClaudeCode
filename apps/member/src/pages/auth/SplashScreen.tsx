import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import logoVertical from '../../assets/logos/logo-vertical.svg'
import { useAuthStore } from '../../stores/useAuthStore'
import AnimatedDice from '../../components/AnimatedDice'

// Flower-of-life interlocking circles pattern — pure SVG tile, no assets needed.
// Each 60×60 tile has 5 circles (4 corners + center) whose edges intersect,
// creating the classic petal/leaf repeat when tiled.
const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
  <circle cx="0"  cy="0"  r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
  <circle cx="60" cy="0"  r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
  <circle cx="0"  cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
  <circle cx="60" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
  <circle cx="30" cy="30" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/>
</svg>`

const PATTERN_DATA_URI = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

const bgStyle: React.CSSProperties = {
  backgroundColor: '#1152d4',
  backgroundImage: PATTERN_DATA_URI,
  backgroundSize: '60px 60px',
  backgroundRepeat: 'repeat',
}

export default function SplashScreen() {
  const navigate = useNavigate()
  const [showSlowText, setShowSlowText] = useState(false)

  useEffect(() => {
    // Show slow-load hint after 5 extra seconds
    const slowTimer = setTimeout(() => setShowSlowText(true), 5000)

    const navTimer = setTimeout(() => {
      const { user, isInitialized } = useAuthStore.getState()
      const dest = isInitialized && user ? '/home' : '/onboarding'
      navigate(dest, { replace: true })
    }, 2600)

    return () => {
      clearTimeout(slowTimer)
      clearTimeout(navTimer)
    }
  }, [navigate])

  return (
    <div className="h-screen flex flex-col relative overflow-hidden" style={bgStyle}>
      {/* Pattern opacity overlay — matches Figma's opacity-10 on the pattern layer */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundColor: 'transparent' }} />

      {/* Centered logo — takes up main body space */}
      <div className="flex-1 flex items-center justify-center">
        <motion.img
          src={logoVertical}
          alt="DEVCON+"
          className="w-36 h-auto"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>

      {/* Bottom section — dice + loading text, matches Figma bottom placement */}
      <div className="flex flex-col items-center gap-3 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <AnimatedDice />
        </motion.div>

        <motion.p
          className="text-white text-[13px] tracking-tight"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: showSlowText ? 1 : 0.7, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {showSlowText
            ? 'Taking longer than usual… check your connection.'
            : 'Hang tight! DEVCON+ will load shortly...'}
        </motion.p>
      </div>
    </div>
  )
}
