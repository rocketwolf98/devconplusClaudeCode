import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { ArrowLeft, Star, Info, X, Loader2, Award } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Reward } from '@devcon-plus/supabase'
import { usePointsStore } from '../../stores/usePointsStore'
import { useRewardsStore } from '../../stores/useRewardsStore'
import { SkeletonRewardCard } from '../../components/Skeleton'
import { staggerContainer, cardItem, slideUp, backdrop } from '../../lib/animation'

// ── Redemption bottom sheet ──────────────────────────────────────────────────

interface RedemptionSheetProps {
  reward: Reward
  spendablePoints: number
  onClose: () => void
}

type SheetState = 'confirm' | 'loading' | 'success' | 'error'

function RedemptionSheet({ reward, spendablePoints, onClose }: RedemptionSheetProps) {
  const { redeemReward } = useRewardsStore()
  const [sheetState, setSheetState] = useState<SheetState>('confirm')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [visible, setVisible] = useState(true)

  const afterRedemptionBalance = spendablePoints - reward.points_cost

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 220)
  }, [onClose])

  useEffect(() => {
    if (sheetState === 'success') {
      const timer = setTimeout(() => handleClose(), 2000)
      return () => clearTimeout(timer)
    }
  }, [sheetState, handleClose])

  const handleConfirm = async () => {
    setSheetState('loading')
    const result = await redeemReward(reward.id)
    if (result.success) {
      setSheetState('success')
    } else {
      setErrorMessage(result.error ?? 'Redemption failed. Please try again.')
      setSheetState('error')
    }
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-[60]"
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={sheetState === 'loading' ? undefined : handleClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl pb-10"
            variants={slideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Confirm Redemption</h2>
              {sheetState !== 'loading' && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </motion.button>
              )}
            </div>

            <div className="px-5 pt-5 pb-2">
              {sheetState === 'confirm' && (
                <>
                  <p className="text-sm text-slate-500 mb-4">You're about to redeem:</p>

                  {/* Reward summary */}
                  <div className="bg-slate-50 rounded-2xl p-4 mb-5 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{reward.name}</p>
                      <p className="text-xs text-gold font-bold flex items-center gap-0.5 mt-0.5">
                        <Star className="w-3 h-3 fill-gold text-gold" />
                        {reward.points_cost.toLocaleString()} pts
                      </p>
                    </div>
                  </div>

                  {/* Balance breakdown */}
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Your balance</span>
                      <span className="font-semibold text-slate-900">{spendablePoints.toLocaleString()} pts</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">After redemption</span>
                      <span className="font-semibold text-slate-900">{afterRedemptionBalance.toLocaleString()} pts</span>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
                    <p className="text-xs text-amber-700 font-medium">This action cannot be undone.</p>
                    <p className="text-xs text-amber-600 mt-0.5">Redemption is subject to availability.</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClose}
                      className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { void handleConfirm() }}
                      disabled={sheetState === 'loading'}
                      className="flex-[2] py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm Redemption
                    </motion.button>
                  </div>
                </>
              )}

              {sheetState === 'loading' && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-slate-500">Processing redemption…</p>
                </div>
              )}

              {sheetState === 'success' && (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <Star className="w-7 h-7 fill-green-500 text-green-500" />
                  </div>
                  <p className="text-base font-bold text-slate-900">Redeemed!</p>
                  <p className="text-sm text-slate-500">Check back at the next event.</p>
                </div>
              )}

              {sheetState === 'error' && (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                    <p className="text-sm font-semibold text-red-700 mb-1">Redemption failed</p>
                    <p className="text-xs text-red-600">{errorMessage}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold"
                  >
                    Close
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── Reward card ───────────────────────────────────────────────────────────────

interface RewardCardProps {
  reward: Reward
  spendablePoints: number
  onRedeem: (reward: Reward) => void
}

function RewardCard({ reward, spendablePoints, onRedeem }: RewardCardProps) {
  const canAfford = spendablePoints >= reward.points_cost
  const deficit = reward.points_cost - spendablePoints
  const hasLowStock = reward.stock_remaining !== null && reward.stock_remaining <= 5

  // Derive 2-char initials from reward name for image placeholder
  const initials = reward.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <motion.div
      variants={cardItem}
      className="rounded-2xl bg-white shadow-card border border-slate-200 overflow-hidden flex flex-col"
    >
      {/* Image area */}
      <div className="relative w-full h-28">
        {reward.image_url ? (
          <img
            src={reward.image_url}
            alt={reward.name}
            className="w-full h-28 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-28 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-2xl font-black text-primary/40 select-none">{initials}</span>
          </div>
        )}
        {hasLowStock && (
          <div className="absolute top-2 right-2 bg-promoted text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Only {reward.stock_remaining} left!
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{reward.name}</p>

        {/* Points cost */}
        <p className="flex items-center gap-0.5 text-xs font-bold text-gold">
          <Star className="w-3 h-3 fill-gold text-gold shrink-0" />
          {reward.points_cost.toLocaleString()} pts
        </p>

        {/* Redeem button */}
        <div className="mt-auto pt-1">
          {canAfford ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onRedeem(reward)}
              className="w-full py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Redeem
            </motion.button>
          ) : (
            <div className="w-full py-2 rounded-xl bg-slate-100 text-center">
              <p className="text-[10px] font-semibold text-slate-400 leading-tight">
                Need {deficit.toLocaleString()} more pts
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Rewards() {
  const navigate = useNavigate()
  const { spendablePoints, loadTotalPoints } = usePointsStore()
  const { rewards, fetchRewards, isLoading } = useRewardsStore()
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)

  useEffect(() => {
    void fetchRewards()
    void loadTotalPoints()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRedeem = useCallback((reward: Reward) => {
    setSelectedReward(reward)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedReward(null)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/home')}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </motion.button>
          <h1 className="text-lg font-bold text-slate-900">Rewards</h1>
        </div>

        {/* Available balance */}
        <div className="flex items-center gap-1.5 pl-11">
          <Star className="w-4 h-4 fill-gold text-gold shrink-0" />
          <span className="text-sm font-bold text-slate-900">
            {spendablePoints.toLocaleString()} pts available
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonRewardCard key={i} />
            ))}
          </div>
        ) : rewards.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Award className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No rewards available yet</h3>
            <p className="text-sm text-slate-500">Check back soon — exciting rewards are coming!</p>
          </div>
        ) : (
          <>
            {/* Card grid */}
            <motion.div
              className="grid grid-cols-2 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  spendablePoints={spendablePoints}
                  onRedeem={handleRedeem}
                />
              ))}
            </motion.div>

            {/* Disclaimer section */}
            <motion.div
              variants={cardItem}
              initial="hidden"
              animate="visible"
              className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
                <p className="text-sm font-bold text-slate-700">Important Notes</p>
              </div>
              <ul className="space-y-1.5">
                {[
                  'Rewards are claimed at DEVCON events only',
                  'Points deducted immediately upon redemption',
                  'Subject to stock availability',
                  'No cash equivalent',
                ].map((note) => (
                  <li key={note} className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </div>

      {/* Redemption bottom sheet */}
      {selectedReward && (
        <RedemptionSheet
          reward={selectedReward}
          spendablePoints={spendablePoints}
          onClose={handleSheetClose}
        />
      )}
    </div>
  )
}
