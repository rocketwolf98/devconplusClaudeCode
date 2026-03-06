import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ComingSoonModal from '../../components/ComingSoonModal'
import { useAuthStore } from '../../stores/useAuthStore'

const COMING_SOON_OPTIONS = ['Profile Visibility', 'Data Export']

export default function Privacy() {
  const navigate = useNavigate()
  const { deleteAccount } = useAuthStore()
  const [modal, setModal] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      navigate('/sign-in')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-primary px-4 pt-14 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-3"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-xl font-bold">Privacy & Security</h1>
      </div>

      <div className="p-4 space-y-2">
        {COMING_SOON_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setModal(opt)}
            className="w-full bg-white rounded-2xl shadow-card px-4 py-4 flex items-center text-left"
          >
            <span className="flex-1 font-medium text-slate-900 text-sm">{opt}</span>
            <span className="text-slate-300">›</span>
          </button>
        ))}

        {/* Delete Account */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full bg-white rounded-2xl shadow-card px-4 py-4 flex items-center text-left"
          >
            <span className="flex-1 font-medium text-red text-sm">Delete Account</span>
            <span className="text-slate-300">›</span>
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-red/20 p-4 space-y-3">
            <p className="text-sm font-bold text-slate-900">Delete your account?</p>
            <p className="text-xs text-slate-500">
              This permanently removes all your data — points, registrations, and profile. This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-xs text-red bg-red/5 border border-red/20 rounded-lg px-3 py-2">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red text-white text-sm font-bold rounded-xl hover:bg-red/90 transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && <ComingSoonModal feature={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
