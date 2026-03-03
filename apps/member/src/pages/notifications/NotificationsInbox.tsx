import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BellOff } from 'lucide-react'

interface NotificationsInboxProps {
  /** Pass true when rendered inside the organizer layout so the header uses bg-blue instead of bg-primary */
  isOrganizer?: boolean
}

export default function NotificationsInbox({ isOrganizer = false }: NotificationsInboxProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className={`${isOrganizer ? 'bg-blue' : 'bg-primary'} px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl`}>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-xl font-bold">Notifications</h1>
      </div>

      {/* Coming soon empty state */}
      <div className="flex flex-col items-center justify-center px-8 pt-24 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
          <BellOff className="w-9 h-9 text-slate-300" />
        </div>
        <p className="text-base font-bold text-slate-700">Notifications coming soon</p>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          You'll be notified here about event updates, points earned, approvals, and more.
        </p>
      </div>
    </div>
  )
}
