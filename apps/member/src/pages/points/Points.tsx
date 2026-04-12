import { useNavigate } from 'react-router-dom'
import {
  Ticket, Mic2, HandHeart, Coffee,
  Heart, Share2, Users, Star, Zap, Copy, Check,
} from 'lucide-react'
import type { SolarIcon } from '../../lib/icons'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { usePointsStore } from '../../stores/usePointsStore'
import { useReferralsStore } from '../../stores/useReferralsStore'
import { staggerContainer, cardItem } from '../../lib/animation'

const PRESTIGE_THRESHOLD = 3000

const EARN: { Icon: SolarIcon; label: string; pts: string; note?: string }[] = [
  { Icon: Ticket,    label: 'Attend an Event',     pts: '5–10 pts',  note: '10 pts with boost' },
  { Icon: HandHeart, label: 'Volunteer at Event',  pts: '+35 pts',   note: '+30 bonus on top of attendance' },
  { Icon: Users,     label: 'Refer a Friend',      pts: '+100 pts',  note: 'Max 1,000 pts/year' },
  { Icon: Mic2,      label: 'Speak at an Event',   pts: '700 pts'    },
  { Icon: Coffee,    label: 'Brown Bag Session',   pts: '250 pts'    },
]

const SHARE: { Icon: SolarIcon; label: string; pts: string }[] = [
  { Icon: Heart,  label: 'Like Content',        pts: '5 pts'     },
  { Icon: Share2, label: 'Share + Submit Link', pts: '10–25 pts' },
]

export default function Points() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { spendablePoints, lifetimePoints, prestigeUnlocked, loadTotalPoints } = usePointsStore()
  const { referralCode, referralCount, annualEarnings, loading: referralsLoading, loadReferralData } = useReferralsStore()

  const [tab, setTab] = useState<'earn' | 'share'>('earn')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user?.id) {
      void loadTotalPoints()
      void loadReferralData()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = Math.min((lifetimePoints / PRESTIGE_THRESHOLD) * 100, 100)

  const handleCopy = () => {
    if (!referralCode) return
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(referralCode).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } else {
      // Fallback: select the text (best effort)
      setCopied(false)
    }
  }

  const earnItems = tab === 'earn' ? EARN : SHARE

  return (
    <div>
      {/* ── Sticky header ─────────────────────────────────────── */}
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-5 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Points+</h1>

        {/* Dual balance display */}
        <div className="mt-3 space-y-1.5">
          {/* Spendable */}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-gold fill-gold shrink-0" />
            <span className="text-white font-black text-lg leading-none">
              {spendablePoints.toLocaleString()} pts
            </span>
            <span className="text-white/60 text-xs">Available to spend</span>
          </div>

          {/* Lifetime */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-white/90 font-semibold text-sm leading-none">
              {lifetimePoints.toLocaleString()} lifetime pts
            </span>
            {!prestigeUnlocked && (
              <span className="text-white/50 text-xs">
                (Prestige: {PRESTIGE_THRESHOLD.toLocaleString()})
              </span>
            )}
            {prestigeUnlocked && (
              <span className="text-gold text-xs font-bold">Prestige Unlocked!</span>
            )}
          </div>

          {/* Lifetime progress bar */}
          {!prestigeUnlocked && (
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mt-1">
              <motion.div
                className="h-full bg-gold rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          )}
        </div>

        {/* Tab toggle */}
        <div className="flex gap-2 mt-4">
          {(['earn', 'share'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? 'bg-white text-primary' : 'bg-white/20 text-white'
              }`}
            >
              {t === 'earn' ? 'Ways to Earn' : 'Share & Earn'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div className="bg-slate-50 min-h-screen p-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {earnItems.map((item) => (
              <motion.div
                key={item.label}
                variants={cardItem}
                className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{item.label}</p>
                      {'note' in item && !!(item as { note?: unknown }).note && (
                        <p className="text-xs text-slate-400 mt-0.5">{String((item as { note?: string }).note)}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-primary ml-2 shrink-0">{item.pts}</span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Redemption note — shown only on earn tab */}
            {tab === 'earn' && (
              <motion.div
                variants={cardItem}
                className="bg-white/60 rounded-2xl px-4 py-3 border border-slate-200"
              >
                <p className="text-xs text-slate-500 text-center">
                  Redeeming rewards deducts from your{' '}
                  <span className="font-semibold text-slate-700">spendable balance only</span>
                  {' '}— lifetime points are never reduced.
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Share & Earn referral card (always visible) ──────── */}
        <div className="mt-4 bg-white rounded-2xl shadow-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <p className="font-bold text-slate-900 text-sm">Share & Earn</p>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Refer a friend and earn <span className="font-semibold text-primary">100 pts</span> per sign-up
          </p>

          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            Your referral code
          </p>

          {referralsLoading ? (
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ) : referralCode !== null ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 font-mono font-bold text-slate-900 text-sm tracking-widest">
                {referralCode}
              </div>
              <motion.button
                onClick={handleCopy}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  copied
                    ? 'bg-green/10 text-green'
                    : 'bg-primary text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </motion.button>
            </div>
          ) : (
            <div className="h-10 flex items-center px-3 bg-slate-100 rounded-xl text-sm text-slate-400">
              Referral code not yet assigned
            </div>
          )}

          {!referralsLoading && (referralCode !== null || referralCount > 0) && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Referred:{' '}
                <span className="font-semibold text-slate-700">{referralCount} friend{referralCount !== 1 ? 's' : ''}</span>
                {'  '}·{'  '}
                <span className="font-semibold text-primary">{annualEarnings.toLocaleString()} pts earned</span>
                {' '}this year
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/points/history')}
          className="w-full mt-4 bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-2xl text-sm shadow-card"
        >
          View Points History
        </button>
      </div>
    </div>
  )
}
