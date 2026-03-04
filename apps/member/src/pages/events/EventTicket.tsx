import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { toPng } from 'html-to-image'
import { useEventsStore } from '../../stores/useEventsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useThemeStore } from '../../stores/useThemeStore'

// Animation variants
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
}

const staggerRows: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.38 } },
}

const rowItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

// Inline horizontal logo — white text paths + multicolor ICON
function LogoHorizontalWhite({ width = 132 }: { width?: number }) {
  const height = Math.round((width / 178) * 27)
  return (
    <svg width={width} height={height} viewBox="0 0 178 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M69.94 0.499878H77.0441L66.98 25.6222H59.8759L49.8118 0.499878H56.9159L63.4279 16.7727L69.94 0.499878Z" fill="white"/>
      <path d="M48.0179 6.09481H34.3277V10.0076H46.7598V15.6025H34.3277V20.0273H48.0179V25.6222H28.0006V0.499878H48.0179V6.09481Z" fill="white"/>
      <path d="M0 25.6222V0.499878H9.2871C18.0192 0.499878 24.1613 5.69257 24.1613 13.0428C24.1613 20.393 18.0192 25.6222 9.2871 25.6222H0ZM6.32707 19.9542H10.2491C14.5782 19.9542 17.6862 17.0653 17.6862 13.0428C17.6862 9.02027 14.5782 6.16795 10.2491 6.16795H6.32707V19.9542Z" fill="white"/>
      <path d="M133.618 25.5612V0.438843H139.945L151.008 15.2855V0.438843H157.335V25.5612H151.008L139.945 10.7145V25.5612H133.618Z" fill="white"/>
      <path d="M90.6972 26C83.2972 26 77.0441 20.0394 77.0441 12.9817C77.0441 5.92405 83.2972 0 90.6972 0C94.6563 0 98.2823 1.68214 100.798 4.31505L96.1733 8.37412C94.8413 6.72855 92.8433 5.66807 90.6972 5.66807C86.8122 5.66807 83.5192 9.03235 83.5192 12.9817C83.5192 16.9677 86.8122 20.3319 90.6972 20.3319C92.8803 20.3319 94.8413 19.2714 96.2103 17.6259L100.798 21.6484C98.2823 24.3179 94.6563 26 90.6972 26Z" fill="white"/>
      <circle cx="122.819" cy="7.55064" r="7.42857" fill="#EA641D"/>
      <circle cx="111.676" cy="7.55064" r="7.42857" fill="#E9C902"/>
      <circle cx="111.676" cy="18.6935" r="7.42857" fill="#5C29A1"/>
      <circle cx="122.819" cy="18.6935" r="7.42857" fill="#73B209"/>
      <circle cx="122.819" cy="7.55064" r="7.42857" fill="#EA641D"/>
      <path d="M117.247 2.6394C118.402 3.94879 119.104 5.6671 119.104 7.55054C119.104 9.4337 118.402 11.1514 117.247 12.4607C116.092 11.1515 115.39 9.43337 115.39 7.55054C115.39 5.66743 116.092 3.9487 117.247 2.6394Z" fill="#E9C902"/>
      <path d="M175.425 11.1364C176.48 11.1364 177.335 11.9917 177.335 13.0468C177.335 14.1019 176.48 14.9572 175.425 14.9572H172.402V18.0223C172.402 19.1483 171.489 20.061 170.363 20.061C169.238 20.061 168.325 19.1483 168.325 18.0223V14.9572H165.245C164.19 14.9572 163.335 14.1019 163.335 13.0468C163.335 11.9917 164.19 11.1364 165.245 11.1364H168.325V8.09973C168.325 6.97379 169.238 6.06104 170.363 6.06104C171.489 6.06104 172.402 6.97379 172.402 8.09973V11.1364H175.425Z" fill="white"/>
    </svg>
  )
}

export default function EventTicket() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ticketRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const { events, registrations } = useEventsStore()
  const { user } = useAuthStore()
  const { activeTheme } = useThemeStore()
  const theme = activeTheme()

  const event = events.find((e) => e.id === id)
  const reg = registrations.find((r) => r.event_id === id)

  if (!event || !reg || reg.status !== 'approved') {
    return (
      <div className="p-4 text-center text-slate-400 pt-20">
        Ticket not available.{' '}
        <button onClick={() => navigate(-1)} className="text-primary">Go back</button>
      </div>
    )
  }

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'Date TBA'

  async function handleDownload() {
    if (!ticketRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        style: { borderRadius: '24px' },
      })
      const link = document.createElement('a')
      const slug = event?.title.replace(/\s+/g, '-').toLowerCase() ?? 'ticket'
      link.download = `devcon-ticket-${slug}.png`
      link.href = dataUrl
      link.click()
    } catch {
      // silently fail — ticket still usable
    } finally {
      setDownloading(false)
    }
  }

  const infoRows: { label: string; value: string; valueClass: string }[] = [
    { label: 'Name',         value: user?.full_name ?? '—',        valueClass: 'text-slate-900 font-medium' },
    { label: 'Ticket ID',    value: reg.qr_code_token ?? '—',      valueClass: 'font-mono text-[11px] text-slate-700 truncate max-w-[160px]' },
    { label: 'Points Value', value: `+${event.points_value} pts`,  valueClass: 'text-green font-bold' },
  ]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, ${theme.darkHex} 0%, ${theme.hex} 100%)` }}
    >

      {/* Floating back button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05, duration: 0.2 }}
        onClick={() => navigate(-1)}
        whileTap={{ scale: 0.92 }}
        className="fixed top-4 left-4 z-20 flex items-center gap-1.5 text-white/90 bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-full text-sm font-medium border border-white/20"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>

      {/* Scrollable content */}
      <div className="flex flex-col items-center px-5 pt-20 pb-12">

        {/* Ticket card — ref captures this for download */}
        <motion.div
          ref={ticketRef}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          style={{ transitionDelay: '0.12s' }}
          className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* ── Primary header strip ── */}
          <div
            className="px-6 pt-6 pb-5 text-center"
            style={{ backgroundColor: theme.hex }}
          >
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.24 }}
              className="flex justify-center mb-4"
            >
              <LogoHorizontalWhite width={128} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.22 }}
            >
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">
                Event Ticket
              </p>
              <h2 className="text-white text-[17px] font-bold mt-1 leading-snug">
                {event.title}
              </h2>
              <p className="text-white/75 text-xs mt-1.5">{dateStr}</p>
              {event.location && (
                <p className="text-white/60 text-xs flex items-center justify-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {event.location}
                </p>
              )}
            </motion.div>
          </div>

          {/* ── White ticket body ── */}
          <div className="bg-white">

            {/* QR code */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="flex justify-center pt-6 pb-5 px-6"
            >
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <QRCodeSVG
                  value={reg.qr_code_token ?? 'DEVCON-TICKET'}
                  size={172}
                  level="H"
                  fgColor={theme.darkHex}
                />
              </div>
            </motion.div>

            {/* Perforated divider with side notches */}
            <div className="relative flex items-center mx-0">
              <div className="absolute -left-3 w-6 h-6 rounded-full bg-slate-100" />
              <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-4" />
              <div className="absolute -right-3 w-6 h-6 rounded-full bg-slate-100" />
            </div>

            {/* Member info rows */}
            <motion.div
              variants={staggerRows}
              initial="hidden"
              animate="visible"
              className="px-6 pt-4 pb-6 space-y-3"
            >
              {infoRows.map(({ label, value, valueClass }) => (
                <motion.div key={label} variants={rowItem} className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className={valueClass}>{value}</span>
                </motion.div>
              ))}
            </motion.div>

          </div>
        </motion.div>

        {/* Download button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.25 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDownload}
          disabled={downloading}
          className="mt-5 flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-7 py-3 rounded-full text-sm font-semibold border border-white/25 disabled:opacity-50 transition-opacity"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Saving…' : 'Download Ticket'}
        </motion.button>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.62, duration: 0.3 }}
          className="text-white/40 text-xs text-center mt-4"
        >
          Show this QR code at the venue entrance
        </motion.p>

      </div>
    </div>
  )
}
