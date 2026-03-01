import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ComingSoonModal from '../../components/ComingSoonModal'

const OPTIONS = ['Profile Visibility', 'Data Export', 'Delete Account']

export default function Privacy() {
  const navigate = useNavigate()
  const [modal, setModal] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue px-4 pt-24 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Privacy</h1>
      </div>
      <button
        onClick={() => navigate(-1)}
        className="absolute top-14 left-4 bg-white/80 backdrop-blur rounded-full w-10 h-10 flex items-center justify-center shadow-card text-slate-700"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

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
