import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, Star, Info, X, Loader2,
  Award, Lock, Gift, CheckCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Reward } from '@devcon-plus/supabase'
import { usePointsStore } from '../../stores/usePointsStore'
import { useRewardsStore } from '../../stores/useRewardsStore'
import { SkeletonRewardCard } from '../../components/Skeleton'
import { staggerContainer, cardItem, slideUp, backdrop } from '../../lib/animation'

// Unique gradient + icon per reward slot — cycles if there are more than 4
const CARD_GRADIENTS = [
  { gradient: 'from-navy to-primary',     Icon: Award  },
  { gradient: 'from-purple-800 to-blue-600', Icon: Gift  },
  { gradient: 'from-teal-700 to-emerald-500', Icon: Star },
  { gradient: 'from-rose-700 to-promoted',  Icon: Award  },
] as const satisfies ReadonlyArray<{ gradient: string; Icon: React.ElementType }>

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
      const timer = setTimeout(() => handleClose(), 2200)
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
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />

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
                      <p className="text-xs font-bold flex items-center gap-0.5 mt-0.5 text-gold">
                        <Star className="w-3 h-3 fill-gold text-gold" />
                        {reward.points_cost.toLocaleString()} pts
                      </p>
                    </div>
                  </div>

                  {/* Balance breakdown */}
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Your balance</span>
                      <span className="font-semibold text-slate-900">
                        {spendablePoints.toLocaleString()} pts
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
                      <span className="text-slate-500">After redemption</span>
                      <span className="font-semibold text-slate-900">
                        {afterRedemptionBalance.toLocaleString()} pts
                      </span>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
                    <p className="text-xs text-amber-700 font-medium">This action cannot be undone.</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Redemption is subject to availability.
                    </p>
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
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-slate-500">Processing redemption…</p>
                </div>
              )}

              {sheetState === 'success' && (
                <div className="flex flex-col items-center py-10 gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green" />
                  </div>
                  <p className="text-base font-bold text-slate-900">Redeemed!</p>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Claim your reward at the next DEVCON event.
                  </p>
                </div>
              )}

              {sheetState === 'error' && (
                <>
                  <div className="bg-red/5 border border-red/20 rounded-xl p-4 mb-5">
                    <p className="text-sm font-semibold text-red mb-1">Redemption failed</p>
                    <p className="text-xs text-red/80">{errorMessage}</p>
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
  index: number
  spendablePoints: number
  onRedeem: (reward: Reward) => void
}

function RewardCard({ reward, index, spendablePoints, onRedeem }: RewardCardProps) {
  const canAfford   = spendablePoints >= reward.points_cost
  const deficit     = reward.points_cost - spendablePoints
  const isOutOfStock = reward.stock_remaining !== null && reward.stock_remaining === 0
  const hasLowStock  = reward.stock_remaining !== null
    && reward.stock_remaining > 0
    && reward.stock_remaining <= 5

  const { gradient, Icon } = CARD_GRADIENTS[index % CARD_GRADIENTS.length]

  return (
    <motion.div
      variants={cardItem}
      className="rounded-2xl bg-white shadow-card overflow-hidden"
    >
      {/* Banner — gradient with centered icon, overlays for locked / OOS */}
      <div className={`relative w-full h-40 bg-gradient-to-br ${gradient}`}>
        {reward.image_url ? (
          <img
            src={reward.image_url}
            alt={reward.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-16 h-16 text-white/20" strokeWidth={1.2} />
          </div>
        )}

        {/* Stock badge — promoted orange if low, subtle black if plenty */}
        {hasLowStock && (
          <div className="absolute top-3 right-3 bg-promoted text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            Only {reward.stock_remaining} left!
          </div>
        )}
        {!hasLowStock && !isOutOfStock && reward.stock_remaining !== null && reward.stock_remaining > 5 && (
          <div className="absolute top-3 right-3 bg-black/30 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
            {reward.stock_remaining} in stock
          </div>
        )}

        {/* Lock overlay — can't afford */}
        {!canAfford && !isOutOfStock && (
          <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <p className="text-white text-xs font-semibold drop-shadow-sm">
              {deficit.toLocaleString()} pts to unlock
            </p>
          </div>
        )}

        {/* Out-of-stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <div className="border border-white/30 bg-white/10 rounded-full px-5 py-1.5">
              <p className="text-white text-xs font-bold tracking-widest uppercase">
                Out of Stock
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Name + per-user limit */}
        <div className="flex items-start gap-2">
          <p className="font-bold text-slate-900 text-[15px] leading-snug flex-1">
            {reward.name}
          </p>
          {reward.max_per_user !== null && (
            <span className="shrink-0 mt-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Max {reward.max_per_user}/yr
            </span>
          )}
        </div>

        {reward.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mt-1">{reward.description}</p>
        )}

        {/* Points + CTA row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-gold text-gold shrink-0" />
            <span className="text-base font-black text-slate-900 leading-none">
              {reward.points_cost.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">pts</span>
          </div>

          {isOutOfStock ? (
            <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold">
              Unavailable
            </div>
          ) : canAfford ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onRedeem(reward)}
              className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-primary"
            >
              Redeem
            </motion.button>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold leading-tight text-center">
              {deficit.toLocaleString()} more pts
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
  const { user } = useAuthStore()
  const { spendablePoints, loadTotalPoints } = usePointsStore()
  const { rewards, fetchRewards, isLoading } = useRewardsStore()
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)

  useEffect(() => {
    void fetchRewards()
    void loadTotalPoints()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRedeem = useCallback((reward: Reward) => {
    setSelectedReward(reward)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedReward(null)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header — matches Points.tsx pattern ── */}
      <div className="sticky top-0 z-10 bg-primary px-4 pt-14 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </motion.button>
          <h1 className="text-lg font-bold text-white">Rewards</h1>
        </div>

        {/* Spendable balance pill */}
        <div className="flex items-center gap-3 bg-white/15 rounded-2xl px-4 py-3">
          <Star className="w-5 h-5 fill-gold text-gold shrink-0" />
          <div>
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5">
              Available to Spend
            </p>
            <p className="text-white font-black text-xl leading-none">
              {spendablePoints.toLocaleString()}
              <span className="text-sm font-medium text-white/70 ml-1">pts</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-5 pb-28">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonRewardCard key={i} />)}
          </div>
        ) : rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Award className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No rewards yet</h3>
            <p className="text-sm text-slate-500">Check back soon — exciting rewards are coming!</p>
          </div>
        ) : (
          <>
            <motion.div
              className="space-y-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {rewards.map((reward, i) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  index={i}
                  spendablePoints={spendablePoints}
                  onRedeem={handleRedeem}
                />
              ))}
            </motion.div>

            {/* Disclaimer */}
            <motion.div
              variants={cardItem}
              initial="hidden"
              animate="visible"
              className="mt-5 rounded-2xl bg-white border border-slate-200 p-4 shadow-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Info className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm font-bold text-slate-700">How Rewards Work</p>
              </div>
              <ul className="space-y-1.5">
                {[
                  'Rewards are claimed at DEVCON events only',
                  'Points are deducted immediately upon redemption',
                  'Subject to stock availability at time of claim',
                  'No cash equivalent — cannot be exchanged for money',
                ].map((note) => (
                  <li key={note} className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-primary/50 mt-0.5 shrink-0">•</span>
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
