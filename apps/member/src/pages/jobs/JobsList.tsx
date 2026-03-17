import { useNavigate } from 'react-router-dom'
import { Briefcase } from 'lucide-react'

export default function JobsList() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-primary px-4 pt-14 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Jobs Board</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Briefcase className="w-8 h-8 text-primary/50" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Jobs Board Coming Soon</h2>
        <p className="text-sm text-slate-500 mb-6">
          Global tech opportunities for Filipino developers will be available here shortly.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="bg-primary text-white font-semibold text-sm px-6 py-2.5 rounded-xl"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
