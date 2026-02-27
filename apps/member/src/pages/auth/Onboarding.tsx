import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Map, Star, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const slides: { gradient: string; Icon: LucideIcon; title: string; subtitle: string }[] = [
  {
    gradient: 'from-navy via-blue to-blue',
    Icon: Users,
    title: "The Philippines' Largest Volunteer Tech Community",
    subtitle: 'DEVCON Philippines',
  },
  {
    gradient: 'from-blue to-navy',
    Icon: Map,
    title: '11 Chapters. 16 Years. 60,000+ Geeks for Good.',
    subtitle: 'Nationwide community',
  },
  {
    gradient: 'from-navy to-blue-dark',
    Icon: Star,
    title: 'Volunteer. Earn Points. Unlock Rewards.',
    subtitle: 'Points+ system',
  },
  {
    gradient: 'from-blue-dark to-navy',
    Icon: Globe,
    title: 'Access Global Opportunities. Level Up Your Career.',
    subtitle: 'Jobs + Career',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const isLast = current === slides.length - 1

  return (
    <div className="h-screen bg-navy flex flex-col overflow-hidden">
      {/* Slide strip */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`min-w-full h-full bg-gradient-to-b ${slide.gradient} flex flex-col items-center justify-center px-8 text-center`}
            >
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-8">
                <slide.Icon className="w-12 h-12 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-white/60 text-sm mb-2">{slide.subtitle}</p>
              <h1 className="text-white text-2xl font-bold leading-tight">{slide.title}</h1>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 py-4 bg-navy/80">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* CTAs */}
      <div className="px-6 pb-10 bg-navy space-y-3">
        {isLast ? (
          <>
            <button
              onClick={() => navigate('/sign-up')}
              className="w-full bg-blue text-white font-bold py-4 rounded-2xl"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/sign-in')}
              className="w-full bg-white/10 text-white font-semibold py-4 rounded-2xl"
            >
              I have an account
            </button>
          </>
        ) : (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="w-full bg-blue text-white font-bold py-4 rounded-2xl"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
