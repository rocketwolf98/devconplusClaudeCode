import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/useAuthStore'
import { createPortal } from 'react-dom'
import { StarOutline, CloseCircleLineDuotone, CupFirstOutline, LockOutline, GiftOutline, CheckCircleOutline } from 'solar-icon-set'
import { motion, AnimatePresence } from 'framer-motion'
import type { Reward } from '@devcon-plus/supabase'
import { usePointsStore } from '../../stores/usePointsStore'
import { useRewardsStore } from '../../stores/useRewardsStore'
import { SkeletonRewardCard } from '../../components/Skeleton'
import { staggerContainer, cardItem, slideUp, backdrop } from '../../lib/animation'
import ComingSoonModal from '../../components/ComingSoonModal'
import { SwipeButton } from '../../components/SwipeButton'

// Figma Assets - Using the same one as Dashboard/VolunteerXpCard
const imgSolarMedalStarCircleBoldDuotone = "https://www.figma.com/api/mcp/asset/04489665-76af-4996-94c5-2fd03ef88f72";

// Flower-of-life pattern matching Dashboard
const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="0" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="0" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="0" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="60" cy="60" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/><circle cx="30" cy="30" r="30" stroke="white" stroke-width="0.8" stroke-opacity="0.10" fill="none"/></svg>`
const PATTERN_BG = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`

// ── Reusable Placeholder ─────────────────────────────────────────────────────

function RewardPlaceholder({ className = "w-full h-full", iconSize = "size-12" }: { className?: string, iconSize?: string }) {
  return (
    <div 
      className={`flex items-center justify-center bg-[#1152d4] ${className}`}
      style={{ 
        backgroundImage: PATTERN_BG,
        backgroundSize: '40px 40px',
        backgroundPosition: 'center'
      }}
    >
      <CupFirstOutline className={iconSize} color="white" />
    </div>
  )
}

// ── Redemption Modal ─────────────────────────────────────────────────────────

interface RedemptionModalProps {
  reward: Reward
  spendablePoints: number
  onClose: () => void
}

type SheetState = 'confirm' | 'loading' | 'success' | 'error'

function RedemptionModal({ reward, spendablePoints, onClose }: RedemptionModalProps) {
  const { redeemReward } = useRewardsStore()
  const [sheetState, setSheetState] = useState<SheetState>('confirm')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [visible, setVisible] = useState(true)

  const isInsufficient = spendablePoints < reward.points_cost

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 220)
  }, [onClose])

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
          <motion.div
            className="fixed inset-0 bg-black/50 z-[60]"
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={sheetState === 'loading' ? undefined : handleClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[24px] overflow-hidden"
            variants={slideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 absolute top-0 left-1/2 -translate-x-1/2 z-20" />
            {sheetState === 'confirm' || sheetState === 'loading' || sheetState === 'error' ? (
              <>
                {/* Header Image Part */}
                <div className="h-[180px] w-full relative bg-slate-100">
                {reward.image_url ? (
                   <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
                ) : (
                   <RewardPlaceholder iconSize="size-16" />
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                  <p className="text-[#6b7280] text-[12px] font-proxima font-semibold">
                    {reward.stock_remaining !== null ? `${reward.stock_remaining} Left in Stock` : 'Available'}
                  </p>
                </div>
                </div>                
                {/* Details Part */}
                <div className="p-6 pt-5">
                  <h2 className="text-[20px] font-proxima font-bold text-slate-900 leading-none mb-2">
                    {reward.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mb-5">
                    <StarOutline className="size-[28px]" color="#F8C630" />
                    <p className="font-proxima font-bold text-[28px] leading-none text-slate-900 tracking-tight">
                      {reward.points_cost.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="h-px w-full bg-slate-200 mb-4" />
                  
                  <p className="text-[14px] text-slate-500 font-proxima leading-relaxed mb-6 line-clamp-3">
                    {reward.description || "Get ready to enjoy this exclusive DEVCON+ reward. Swipe to redeem and claim it at the next event!"}
                  </p>

                  {isInsufficient && (
                    <div className="bg-red/5 border border-red/20 rounded-xl p-4 mb-4">
                      <p className="text-[14px] font-semibold text-red mb-1 flex items-center gap-2">
                        <LockOutline className="size-4" color="#EF4444" /> Not Enough Points
                      </p>
                      <p className="text-[12px] text-red/80">You need {(reward.points_cost - spendablePoints).toLocaleString()} more points to redeem this item.</p>
                    </div>
                  )}

                  {sheetState === 'error' && (
                    <div className="bg-red/5 border border-red/20 rounded-xl p-4 mb-4">
                      <p className="text-[14px] font-semibold text-red mb-1">Redemption failed</p>
                      <p className="text-[12px] text-red/80">{errorMessage}</p>
                    </div>
                  )}

                  <SwipeButton 
                    onConfirm={() => { void handleConfirm() }} 
                    disabled={isInsufficient || sheetState === 'loading' || sheetState === 'error'} 
                    isLoading={sheetState === 'loading'}
                  />
                </div>
              </>
            ) : (
              // Success State: Claim Receipt View
              <div className="p-6 flex flex-col items-center text-center">
                 <div className="size-[80px] bg-green/10 rounded-full flex items-center justify-center mb-5 mt-4">
                    <CheckCircleOutline className="size-[40px] text-[#21C45D]" />
                 </div>
                 <h2 className="text-[24px] font-proxima font-bold text-slate-900 mb-2">Claim Receipt</h2>
                 <p className="text-[15px] text-slate-500 leading-relaxed mb-6">
                   You have successfully redeemed <strong>{reward.name}</strong> for {reward.points_cost.toLocaleString()} points.
                 </p>
                 <div className="w-full bg-slate-50 rounded-[16px] p-5 mb-6 text-left border border-slate-100">
                    <p className="text-[14px] text-slate-600">Present this receipt at the DEVCON merch booth to claim your item.</p>
                 </div>
                 <button onClick={handleClose} className="w-full py-4 bg-[#1152d4] text-white rounded-[16px] font-proxima font-bold text-[16px] hover:bg-[#0b46a3] transition-colors">
                   Done
                 </button>
              </div>
            )}
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
  const isOutOfStock = reward.stock_remaining !== null && reward.stock_remaining === 0

  return (
    <motion.div
      variants={cardItem}
      onClick={() => onRedeem(reward)}
      className="bg-white rounded-[16px] border border-[rgba(156,163,175,0.3)] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col h-[280px] cursor-pointer relative"
    >
      {/* Image Part */}
      <div className="h-[176px] relative shrink-0 bg-slate-100">
        {reward.image_url ? (
          <img
            src={reward.image_url}
            alt={reward.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <RewardPlaceholder iconSize="size-16" />
        )}

        {/* Locked / OOS Overlay */}
        {(!canAfford || isOutOfStock) && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-[10px] p-4 text-center z-10">
            <div className="size-[42px] bg-white rounded-full flex items-center justify-center overflow-hidden shadow-sm">
               <LockOutline className="size-6" color="#F8C630" />
            </div>
            <p className="text-white text-[12px] font-proxima font-semibold drop-shadow-sm leading-tight">
              {isOutOfStock ? 'Sold Out' : 'Not Enough Points'}
            </p>
          </div>
        )}
      </div>

      {/* Body Part */}
      <div className="p-[12px] flex-1 flex flex-col justify-between">
        <div className="flex flex-col gap-[6px]">
          <p className="text-black text-[12px] font-proxima font-semibold leading-snug line-clamp-2">
            {reward.name}
          </p>
          
          <div className="flex items-center gap-[4px]">
             {/* Matching Dashboard XP Star Color */}
             <StarOutline className="size-[18px]" color="#F8C630" />
             <p className="text-black text-[20px] font-proxima font-bold leading-none">
               {reward.points_cost.toLocaleString()}
             </p>
          </div>
        </div>

        {/* Stock Badge */}
        <div className="bg-[rgba(102,102,102,0.1)] px-[10px] py-[4px] rounded-[100px] w-fit mt-1">
          <p className="text-[#6b7280] text-[9px] font-proxima font-semibold leading-none">
            {isOutOfStock ? 'Sold Out' : `${reward.stock_remaining ?? 0} Left in Stock`}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Claim Receipts Tab Content ────────────────────────────────────────────────

function ClaimReceiptsTab() {
  const { redemptions, allRewards, rewards, fetchAllRewards, loadRedemptions, isLoading } = useRewardsStore()

  useEffect(() => {
    void loadRedemptions()
    if (allRewards.length === 0) {
      void fetchAllRewards()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center pt-10 px-8 text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500">Loading your receipts...</p>
      </div>
    )
  }

  if (!redemptions || redemptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-10 px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <GiftOutline className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No receipts yet</h3>
        <p className="text-sm text-slate-500">You haven't redeemed any rewards.</p>
      </div>
    )
  }

  return (
    <motion.div 
      className="grid grid-cols-1 gap-[10px]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {redemptions.map(redemption => {
        // Try active rewards first, then fallback to allRewards (for inactive ones)
        const reward = rewards.find(r => r.id === redemption.reward_id) || allRewards.find(r => r.id === redemption.reward_id)
        
        return (
          <motion.div key={redemption.id} variants={cardItem} className="bg-white border border-[rgba(156,163,175,0.3)] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.1)] rounded-[16px] p-3 flex items-center gap-4">
            <div className="size-[72px] bg-slate-100 rounded-[12px] overflow-hidden shrink-0">
              {reward?.image_url ? (
                <img src={reward.image_url} alt={reward?.name || 'Reward'} className="w-full h-full object-cover" />
              ) : (
                <RewardPlaceholder iconSize="size-8" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-proxima font-bold text-[14px] text-slate-900 leading-snug mb-1 truncate">
                {reward?.name || 'Unknown Reward'}
              </p>
              <p className="text-[12px] text-slate-500 mb-2">
                {new Date(redemption.redeemed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <div className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                (redemption as any).status === 'claimed' 
                  ? 'bg-slate-100 text-slate-600' 
                  : 'bg-[#eef4ff] text-[#1152d4]'
              }`}>
                {(redemption as any).status === 'claimed' ? 'Claimed' : 'Ready to Claim'}
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'redeem',  label: 'Redeem Rewards' },
  { id: 'receipts', label: 'Claim Receipts' },
  { id: 'content',  label: 'Share Content' },
  { id: 'refer',    label: 'Refer a Friend' },
] as const

export default function Rewards() {
  const { user } = useAuthStore()
  const { spendablePoints, loadTotalPoints } = usePointsStore()
  const { rewards, fetchRewards, isLoading } = useRewardsStore()
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('redeem')
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null)

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

  const handleTabClick = (tabId: typeof TABS[number]['id'], label: string) => {
    if (tabId === 'redeem' || tabId === 'receipts') {
      setActiveTab(tabId)
    } else {
      setComingSoonFeature(label)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
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
          {/* Header Row: Title */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-6">
            <h1 className="text-white text-[24px] font-semibold font-proxima leading-none tracking-tight">
              Rewards
            </h1>
          </div>
        </div>

        {/* ── Points Card Overlay ── */}
        <div className="relative z-10 flex flex-col px-[25px] -mt-[40px] pointer-events-none">
          <div className="bg-white rounded-[24px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.1)] border border-slate-400/30 px-[21px] py-6 flex items-center pointer-events-auto">
            <div className="flex items-center gap-[8px]">
              <div className="shrink-0 size-[48px]">
                <img 
                  src={imgSolarMedalStarCircleBoldDuotone} 
                  alt="Medal" 
                  className="size-full object-contain"
                />
              </div>
              <div className="flex flex-col justify-center translate-y-px">
                <p className="font-proxima text-[#6b7280] text-[14px] leading-none mb-[6px]">
                  Spendable Points
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-proxima font-extrabold text-[40.867px] text-[#464646] leading-none tracking-[-1.226px]">
                    {spendablePoints.toLocaleString()}
                  </p>
                  <p className="font-proxima font-semibold text-[24px] text-[#464646] leading-none">
                    XP
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs Wrapper ── */}
        <div className="pt-4 pb-2 px-[25px] pointer-events-auto">
          <div className="flex gap-[6px] overflow-x-auto no-scrollbar max-w-4xl mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.label)}
                className={`whitespace-nowrap px-[12px] h-[32px] flex-1 flex items-center justify-center rounded-[128px] text-[14px] font-proxima font-bold transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#1152d4] text-white shadow-sm'
                    : 'bg-[#1152d4]/10 text-[#1152d4]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="md:max-w-4xl md:mx-auto px-[25px] pt-4 pb-28">
        {activeTab === 'redeem' ? (
          isLoading ? (
            <div className="grid grid-cols-2 gap-x-[6px] gap-y-[10px]">
              {[1, 2, 3, 4].map((i) => <SkeletonRewardCard key={i} />)}
            </div>
          ) : rewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-10 px-8 text-center">
              <RewardPlaceholder className="w-16 h-16 rounded-full mb-4" iconSize="w-8 h-8" />
              <h3 className="text-base font-bold text-slate-900 mb-1">No rewards yet</h3>
              <p className="text-sm text-slate-500">Check back soon — exciting rewards are coming!</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-x-[6px] gap-y-[10px]"
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
          )
        ) : activeTab === 'receipts' ? (
          <ClaimReceiptsTab />
        ) : null}
      </div>

      {selectedReward && (
        <RedemptionModal
          reward={selectedReward}
          spendablePoints={spendablePoints}
          onClose={handleSheetClose}
        />
      )}

      {comingSoonFeature && (
        <ComingSoonModal
          feature={comingSoonFeature}
          onClose={() => setComingSoonFeature(null)}
        />
      )}
    </div>
  )
}
