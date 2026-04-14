import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenOutline, TrashBinTrashOutline, AddCircleOutline, GiftOutline, BoxOutline } from 'solar-icon-set'
import { motion } from 'framer-motion'
import { useRewardsStore } from '../../../stores/useRewardsStore'
import { staggerContainer, cardItem, fadeUp } from '../../../lib/animation'

// Flower-of-life pattern matching Rewards/Dashboard/Events
const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="0" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="0" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="30" cy="30" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/></svg>`
const PATTERN_BG = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

export function OrgRewardsManagement() {
  const navigate = useNavigate()
  const { allRewards, isLoadingAll, fetchAllRewards, deleteReward } = useRewardsStore()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => { void fetchAllRewards() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const activeCount = allRewards.filter((r) => r.is_active).length

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex flex-col pointer-events-none">
        {/* ── Glassmorphism Background ── */}
        <div className="absolute inset-0 backdrop-blur-md bg-slate-50/80 pointer-events-auto -z-10" />

        {/* ── Blue Background Container ── */}
        <div 
          className="bg-[#1152d4] relative overflow-hidden z-0 pointer-events-auto pb-[64px]"
          style={{ 
            clipPath: 'ellipse(100% 100% at 50% 0%)',
            backgroundImage: PATTERN_BG,
            backgroundSize: '60px 60px',
            backgroundPosition: 'top center',
            backgroundRepeat: 'repeat'
          }}
        >
          {/* Header Row: Title + Icons */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
            <h1 className="text-white text-[28px] font-semibold font-proxima leading-none tracking-tight">
              Rewards
            </h1>
            
            <button
              onClick={() => navigate('/organizer/rewards/create')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white text-sm font-bold rounded-xl active:bg-white/30 transition-colors shrink-0"
            >
              <AddCircleOutline className="w-4 h-4" />
              Add Reward
            </button>
          </div>
        </div>

        {/* ── Stats Card Overlay ── */}
        <div className="relative z-10 flex flex-col px-[25px] -mt-[40px] pointer-events-none">
          <div className="bg-white rounded-[24px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.1)] border border-slate-400/30 h-[100px] flex items-center pointer-events-auto">
            {/* Total */}
            <div className="flex-1 flex items-center gap-[10px] pl-[20px]">
              <div className="shrink-0 size-[40px] bg-blue/10 rounded-xl flex items-center justify-center">
                <GiftOutline className="size-5" color="#1152d4" />
              </div>
              <div className="flex flex-col justify-center translate-y-px">
                <p className="font-proxima text-[#6b7280] text-[12px] leading-none mb-[6px] uppercase tracking-wide">
                  Total
                </p>
                <p className="font-proxima font-extrabold text-[24px] text-[#464646] leading-none tracking-tight">
                  {allRewards.length}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-[50px] bg-slate-100" />

            {/* Active */}
            <div className="flex-1 flex items-center gap-[10px] pl-[20px]">
              <div className="shrink-0 size-[40px] bg-green/10 rounded-xl flex items-center justify-center">
                <BoxOutline className="size-5" color="#21C45D" />
              </div>
              <div className="flex flex-col justify-center translate-y-px">
                <p className="font-proxima text-[#6b7280] text-[12px] leading-none mb-[6px] uppercase tracking-wide">
                  Active
                </p>
                <p className="font-proxima font-extrabold text-[24px] text-[#464646] leading-none tracking-tight">
                  {activeCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className="p-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {deleteError && (
          <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2">
            {deleteError}
          </p>
        )}

        {/* Rewards list */}
        {isLoadingAll && allRewards.length === 0 ? (
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue border-t-transparent animate-spin mx-auto" />
          </motion.div>
        ) : (
          <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="visible">
            {allRewards.length === 0 ? (
              <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-base font-bold text-slate-700">No rewards yet</p>
                <p className="text-sm text-slate-400 mt-1">Add items to the catalog.</p>
              </motion.div>
            ) : (
              allRewards.map((reward) => (
                <motion.div
                  key={reward.id}
                  variants={cardItem}
                  className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden"
                >
                  <div className="flex items-stretch gap-0">
                    {/* Image / placeholder */}
                    <div className="w-20 shrink-0">
                      {reward.image_url ? (
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue/10 flex items-center justify-center">
                          <GiftOutline className="w-6 h-6" color="rgba(17,82,212,0.3)" />
                        </div>
                      )}
                    </div>

                    {/* InfoCircleOutline */}
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
                              onClick={() => navigate(`/organizer/rewards/${reward.id}/edit`)}
                              className="w-7 h-7 rounded-lg bg-blue/10 flex items-center justify-center active:bg-blue/20 transition-colors"
                            >
                              <PenOutline className="w-3.5 h-3.5" color="#1152D4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(reward.id)}
                              className="w-7 h-7 rounded-lg bg-red/10 flex items-center justify-center active:bg-red/20 transition-colors"
                            >
                              <TrashBinTrashOutline className="w-3.5 h-3.5" color="#EF4444" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-bold text-blue bg-blue/10 px-2 py-0.5 rounded-full">
                          {reward.points_cost.toLocaleString()} pts
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          {reward.claim_method === 'digital_delivery' ? 'Digital' : 'On-site'}
                        </span>
                        {!reward.is_active && (
                          <span className="text-[10px] font-bold text-red/60 bg-red/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            Inactive
                          </span>
                        )}
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
        )}
      </motion.div>
    </div>
  )
}
