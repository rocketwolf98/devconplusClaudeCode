import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePointsStore } from '../../stores/usePointsStore'
import TransactionRow from '../../components/TransactionRow'
import type { PointTransaction } from '@devcon-plus/supabase'

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
  const { transactions, totalPoints } = usePointsStore()

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
  )
  const groups = groupByDate(sorted)

  return (
    <div>
      <div className="bg-blue px-4 pt-24 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Points History</h1>
        <p className="text-gold font-bold text-2xl mt-1">{totalPoints.toLocaleString()} pts</p>
      </div>
      <button
        onClick={() => navigate(-1)}
        className="absolute top-14 left-4 bg-white/80 backdrop-blur rounded-full w-10 h-10 flex items-center justify-center shadow-card text-slate-700"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="bg-slate-50 min-h-screen p-4">
        {groups.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No transactions yet</div>
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
