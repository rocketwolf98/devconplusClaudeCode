import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftOutline, StarOutline, BoltOutline } from 'solar-icon-set'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { usePointsStore } from '../../stores/usePointsStore'
import TransactionRow from '../../components/TransactionRow'
import { SkeletonTransactionGroup } from '../../components/Skeleton'
import type { PointTransaction } from '@devcon-plus/supabase'

type SourceFilter =
  | 'all'
  | 'event_attendance'
  | 'volunteering'
  | 'referral'
  | 'speaking'
  | 'brown_bag'
  | 'redemption'
  | 'signup'
  | 'bonus'

const FILTER_CHIPS: { id: SourceFilter; label: string }[] = [
  { id: 'all',              label: 'All'          },
  { id: 'event_attendance', label: 'Events'       },
  { id: 'volunteering',     label: 'Volunteering' },
  { id: 'referral',         label: 'Referrals'    },
  { id: 'speaking',         label: 'Speaking'     },
  { id: 'brown_bag',        label: 'Brown Bag'    },
  { id: 'redemption',       label: 'Redeemed'     },
  { id: 'signup',           label: 'Sign-up'      },
  { id: 'bonus',            label: 'Bonus'        },
]

function groupByDate(txs: PointTransaction[]): Array<[string, PointTransaction[]]> {
  const groups: Record<string, PointTransaction[]> = {}
  for (const tx of txs) {
    const day = new Date(tx.created_at ?? '').toLocaleDateString('en-PH', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    if (!groups[day]) groups[day] = []
    groups[day].push(tx)
  }
  return Object.entries(groups)
}

export default function PointsHistory() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    transactions,
    spendablePoints,
    lifetimePoints,
    loadTransactions,
    loadTotalPoints,
    isLoading,
  } = usePointsStore()

  const [activeFilter, setActiveFilter] = useState<SourceFilter>('all')

  useEffect(() => {
    if (user?.id) {
      void loadTransactions()
      void loadTotalPoints()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
  )

  const filtered =
    activeFilter === 'all'
      ? sorted
      : sorted.filter((tx) => tx.source === activeFilter)

  const groups = groupByDate(filtered)

  return (
    <div>
      {/* ── Sticky header ──────────────────────────────────────── */}
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-4 rounded-b-3xl">
        <motion.button
          onClick={() => navigate(-1)}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeftOutline className="w-5 h-5 text-white" />
        </motion.button>

        <h1 className="text-white text-xl font-bold">Points History</h1>

        {/* Dual balance pills */}
        <div className="flex gap-2 mt-3">
          {/* Spendable */}
          <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-1.5">
            <StarOutline className="w-4 h-4 text-gold fill-gold shrink-0" />
            <div>
              <p className="text-white font-black text-base leading-none">
                {spendablePoints.toLocaleString()} pts
              </p>
              <p className="text-white/60 text-[10px] mt-0.5">available</p>
            </div>
          </div>

          {/* Lifetime */}
          <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-1.5">
            <BoltOutline className="w-4 h-4 text-white/70 shrink-0" />
            <div>
              <p className="text-white font-black text-base leading-none">
                {lifetimePoints.toLocaleString()} pts
              </p>
              <p className="text-white/60 text-[10px] mt-0.5">lifetime</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter chips ───────────────────────────────────────── */}
      <div
        className="bg-white border-b border-slate-100 px-4 py-2 overflow-x-auto flex gap-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeFilter === chip.id
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Transaction list ───────────────────────────────────── */}
      <div className="bg-slate-50 min-h-screen p-4 pb-24">
        {isLoading ? (
          <>
            <SkeletonTransactionGroup rows={3} />
            <SkeletonTransactionGroup rows={2} />
          </>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {activeFilter === 'all' ? 'No transactions yet' : 'No transactions in this category'}
          </div>
        ) : (
          groups.map(([date, txs]) => (
            <div key={date} className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{date}</p>
              <div className="bg-white rounded-2xl shadow-card px-4">
                {txs.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
              </div>
            </div>
          ))
        )}

        {groups.length > 0 && (
          <p className="text-center text-xs text-slate-400 mt-6 pb-4">That's it!</p>
        )}
      </div>
    </div>
  )
}
