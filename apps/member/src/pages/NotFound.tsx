import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Drawing404 from '../components/Drawing404'

const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="0" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="0" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="30" cy="30" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/></svg>`
const PATTERN_BG = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 text-center relative overflow-y-auto py-12"
      style={{ 
        backgroundColor: 'rgb(var(--color-primary))',
      }}
    >
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ 
          backgroundImage: PATTERN_BG,
          backgroundSize: '60px 60px',
          backgroundPosition: 'top center',
          backgroundRepeat: 'repeat',
          opacity: 0.4
        }}
      />

      {/* Content wrapper to stay above pattern */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        
        {/* Animated Sketch Icon */}
        <Drawing404 />

        {/* 404 text with entrance animation */}
        <motion.p
          className="text-7xl font-black text-white leading-none tracking-tighter mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          404
        </motion.p>

        {/* Heading + body */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <h1 className="text-md3-headline-sm font-bold text-white">Whoops! Lost in the Matrix.</h1>
          <p className="text-white/70 mt-3 leading-relaxed">
            We couldn't find the page you're looking for. 
            The "source code" for this reality seems to have a bug!
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 mt-12 w-full sm:w-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <motion.button
            onClick={() => navigate('/home')}
            className="bg-white text-primary font-bold text-md3-body-lg px-10 py-4 rounded-full shadow-xl hover:bg-slate-50 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            Back to Home
          </motion.button>
          <motion.button
            onClick={() => navigate(-1)}
            className="bg-white/10 border border-white/20 text-white font-semibold text-md3-body-lg px-10 py-4 rounded-full backdrop-blur-md transition-all hover:bg-white/20"
            whileTap={{ scale: 0.95 }}
          >
            Go Back
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
