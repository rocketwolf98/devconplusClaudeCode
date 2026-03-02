import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const slides = [
  {
    image:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1080&q=80&auto=format&fit=crop',
    subtitle: 'DEVCON Philippines',
    title: "The Philippines' Largest Volunteer Tech Community",
  },
  {
    image:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1080&q=80&auto=format&fit=crop',
    subtitle: 'Nationwide community',
    title: '11 Chapters. 16 Years. 60,000+ Geeks for Good.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1080&q=80&auto=format&fit=crop',
    subtitle: 'Points+ system',
    title: 'Volunteer. Earn Points. Unlock Rewards.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1080&q=80&auto=format&fit=crop',
    subtitle: 'Jobs + Career',
    title: 'Access Global Opportunities. Level Up Your Career.',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const isLast = current === slides.length - 1

  const goTo = (i: number) => setCurrent(Math.max(0, Math.min(slides.length - 1, i)))

  const handlePointerDown = (e: React.PointerEvent) => setDragStart(e.clientX)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStart === null) return
    const diff = dragStart - e.clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < slides.length - 1) setCurrent((c) => c + 1)
      if (diff < 0 && current > 0) setCurrent((c) => c - 1)
    }
    setDragStart(null)
  }

  return (
    <div
      className="h-screen overflow-hidden relative bg-navy select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* ── Sliding photo strip ──────────────────────────────── */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{
          width: `${slides.length * 100}%`,
          transform: `translateX(-${(current / slides.length) * 100}%)`,
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="relative h-full overflow-hidden"
            style={{ width: `${100 / slides.length}%` }}
          >
            {/* High-res background photo */}
            <img
              src={slide.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
            {/* Subtle overlay — just enough to keep photo from clashing with header */}
            <div className="absolute inset-0 bg-navy/30" />
          </div>
        ))}
      </div>

      {/* ── Fixed header ─────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
            <span className="text-navy text-[11px] font-black leading-none tracking-tight">
              D+
            </span>
          </div>
          <span className="text-white font-bold text-[15px] tracking-wide">DEVCON+</span>
        </div>
        <button
          onClick={() => navigate('/sign-up')}
          className="text-white/75 text-sm font-medium px-1 py-1"
        >
          Skip
        </button>
      </div>

      {/* ── Fixed bottom panel ───────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-blue rounded-t-[28px] px-6 pt-6 pb-10">
        {/* Slide caption */}
        <div key={current} className="mb-5 animate-[fadeIn_0.3s_ease-out]">
          <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest mb-1.5">
            {slides[current].subtitle}
          </p>
          <h2 className="text-white text-[22px] font-bold leading-snug">
            {slides[current].title}
          </h2>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        {isLast ? (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/sign-up')}
              className="w-full bg-white text-blue font-bold py-[15px] rounded-2xl text-[15px]"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/sign-in')}
              className="w-full border border-white/20 text-white/80 font-semibold py-[15px] rounded-2xl text-[15px]"
            >
              I have an account
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="w-full bg-white text-blue font-bold py-[15px] rounded-2xl text-[15px]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
