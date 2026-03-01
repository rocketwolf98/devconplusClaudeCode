import { useState, useEffect } from 'react'
import { Smartphone } from 'lucide-react'

const DESKTOP_BREAKPOINT = 1024

export default function DesktopGuard({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth > DESKTOP_BREAKPOINT)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${DESKTOP_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-blue flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-3xl mb-6">
          D+
        </div>
        <h1 className="text-white text-3xl font-black mb-1">
          DEVCON<span className="text-gold">+</span>
        </h1>
        <p className="text-white/50 text-xs mb-6 tracking-widest uppercase">Sync. Support. Succeed.</p>
        <div className="w-16 h-px bg-white/20 mx-auto mb-6" />
        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4">
          <Smartphone className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">Mobile & Tablet Only</h2>
        <p className="text-white/60 text-sm max-w-xs leading-relaxed">
          DEVCON+ is designed for mobile and tablet screens. Open this app on your phone or tablet for the best experience.
        </p>
        <p className="text-white/30 text-xs mt-8">Best viewed on screens up to 1024px wide</p>
      </div>
    )
  }

  return <>{children}</>
}
