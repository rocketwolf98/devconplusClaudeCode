interface Props {
  onClose: () => void
  feature?: string
}

export default function ComingSoonModal({ onClose, feature = 'This feature' }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-6" />
        <div className="text-center">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Coming Soon</h2>
          <p className="text-sm text-slate-500 mb-6">{feature} is launching soon. Stay tuned!</p>
          <button
            onClick={onClose}
            className="w-full bg-blue text-white font-bold py-3 rounded-xl"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
