import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ComingSoonModal from '../../components/ComingSoonModal'

const OPTIONS = ['Profile Visibility', 'Data Export', 'Delete Account']

export default function Privacy() {
  const navigate = useNavigate()
  const [modal, setModal] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-navy px-4 pt-14 pb-6">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">← Back</button>
        <h1 className="text-white text-xl font-bold">Privacy</h1>
      </div>

      <div className="p-4 space-y-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setModal(opt)}
            className="w-full bg-white rounded-2xl shadow-card px-4 py-4 flex items-center text-left"
          >
            <span className="flex-1 font-medium text-slate-900 text-sm">{opt}</span>
            <span className="text-slate-300">›</span>
          </button>
        ))}
      </div>

      {modal && <ComingSoonModal feature={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
