import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus, Gift, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRewardsStore } from '../../../stores/useRewardsStore'
import ComingSoonModal from '../../../components/ComingSoonModal'
import { staggerContainer, cardItem, fadeUp } from '../../../lib/animation'

export function OrgRewardsManagement() {
  const { rewards, fetchRewards, deleteReward } = useRewardsStore()
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => { void fetchRewards() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteReward(id)
      setDeleteConfirmId(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      {/* Sticky header */}
      <div className="bg-blue px-4 pt-12 sticky top-0 z-10 pb-6 rounded-b-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Rewards</h1>
            <p className="text-white/60 text-sm mt-0.5">Manage the catalog</p>
          </div>
          <button
            onClick={() => setComingSoonFeature('Add Reward')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white text-sm font-bold rounded-xl active:bg-white/30 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Reward
          </button>
        </div>
      </div>

      <motion.div
        className="p-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Summary strip */}
        <motion.div variants={fadeUp} className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-card px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue/10 flex items-center justify-center">
              <Gift className="w-4.5 h-4.5 text-blue" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">{rewards.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Total Rewards</p>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-card px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green/10 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-green" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">
                {rewards.filter((r) => r.is_active).length}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Active</p>
            </div>
          </div>
        </motion.div>

        {deleteError && (
          <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2">
            {deleteError}
          </p>
        )}

        {/* Rewards list */}
        <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="visible">
          {rewards.length === 0 ? (
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-base font-bold text-slate-700">No rewards yet</p>
              <p className="text-sm text-slate-400 mt-1">Add items to the catalog.</p>
            </motion.div>
          ) : (
            rewards.map((reward) => (
              <motion.div
                key={reward.id}
                variants={cardItem}
                className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden"
              >
                <div className="flex items-stretch gap-0">
                  {/* Reward image / placeholder */}
                  <div className="w-20 shrink-0">
                    {reward.image_url ? (
                      <img
                        src={reward.image_url}
                        alt={reward.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue/10 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-blue/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-snug truncate">
                          {reward.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {reward.description}
                        </p>
                      </div>

                      {/* Action buttons */}
                      {deleteConfirmId !== reward.id && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setComingSoonFeature(`Edit ${reward.name}`)}
                            className="w-7 h-7 rounded-lg bg-blue/10 flex items-center justify-center active:bg-blue/20 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(reward.id)}
                            className="w-7 h-7 rounded-lg bg-red/10 flex items-center justify-center active:bg-red/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-blue bg-blue/10 px-2 py-0.5 rounded-full">
                        {reward.points_cost.toLocaleString()} pts
                      </span>
                      <span className="text-xs text-slate-400 capitalize">
                        {reward.claim_method === 'digital_delivery' ? 'Digital' : 'On-site'}
                      </span>
                      {reward.is_coming_soon && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          Coming Soon
                        </span>
                      )}
                    </div>

                    {/* Inline delete confirm */}
                    {deleteConfirmId === reward.id && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500">Remove from catalog?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => void handleDelete(reward.id)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 rounded-lg bg-red text-white text-xs font-semibold disabled:opacity-50"
                          >
                            {isDeleting ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.div>

      {comingSoonFeature && (
        <ComingSoonModal feature={comingSoonFeature} onClose={() => setComingSoonFeature(null)} />
      )}
    </div>
  )
}
