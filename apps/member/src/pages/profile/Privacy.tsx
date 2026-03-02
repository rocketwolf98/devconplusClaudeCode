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
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
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
