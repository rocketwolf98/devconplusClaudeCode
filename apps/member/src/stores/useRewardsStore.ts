import { create } from 'zustand'
import type { Reward, RewardRedemption } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'
import { usePointsStore } from './usePointsStore'
import type { RewardFormData } from '../pages/organizer/rewards/rewardFormConstants'

interface RewardsState {
  // Member-facing: active rewards only
  rewards: Reward[]
  // Organizer-facing: all rewards including inactive
  allRewards: Reward[]

  redemptions: RewardRedemption[]

  isLoading: boolean      // member fetchRewards / redeemReward / loadRedemptions
  isLoadingAll: boolean   // organizer fetchAllRewards
  error: string | null

  fetchRewards: () => Promise<void>
  fetchAllRewards: () => Promise<void>
  createReward: (data: RewardFormData, imageUrl: string | null) => Promise<void>
  updateReward: (id: string, data: RewardFormData, imageUrl: string | null) => Promise<void>
  deleteReward: (id: string) => Promise<void>
  subscribeToChanges: () => () => void
  redeemReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>
  loadRedemptions: () => Promise<void>
}

export const useRewardsStore = create<RewardsState>((set, get) => ({
  rewards: [],
  allRewards: [],
  redemptions: [],
  isLoading: false,
  isLoadingAll: false,
  error: null,

  // ── Member: active rewards only ─────────────────────────────────────────
  fetchRewards: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true })
      if (error) throw error
      set({ rewards: (data ?? []) as Reward[] })
    } catch (err) {
      set({ rewards: [], error: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ isLoading: false })
    }
  },

  // ── Organizer: all rewards ───────────────────────────────────────────────
  fetchAllRewards: async () => {
    set({ isLoadingAll: true, error: null })
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('points_cost', { ascending: true })
      if (error) throw error
      set({ allRewards: (data ?? []) as Reward[] })
    } catch (err) {
      set({ allRewards: [], error: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ isLoadingAll: false })
    }
  },

  // ── Create ───────────────────────────────────────────────────────────────
  createReward: async (data, imageUrl) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      points_cost: data.points_cost,
      type: data.type,
      claim_method: data.claim_method,
      stock_remaining: data.stock_remaining ?? null,
      max_per_user: data.max_per_user ?? null,
      is_active: data.is_active,
      is_coming_soon: data.is_coming_soon,
      image_url: imageUrl,
    }
    const { error } = await supabase.from('rewards').insert(payload)
    if (error) throw new Error(error.message)
    await Promise.all([get().fetchAllRewards(), get().fetchRewards()])
  },

  // ── Update ───────────────────────────────────────────────────────────────
  updateReward: async (id, data, imageUrl) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      points_cost: data.points_cost,
      type: data.type,
      claim_method: data.claim_method,
      stock_remaining: data.stock_remaining ?? null,
      max_per_user: data.max_per_user ?? null,
      is_active: data.is_active,
      is_coming_soon: data.is_coming_soon,
      image_url: imageUrl,
    }
    const { error } = await supabase.from('rewards').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
    await Promise.all([get().fetchAllRewards(), get().fetchRewards()])
  },

  // ── Delete (soft) ────────────────────────────────────────────────────────
  deleteReward: async (id) => {
    const { error } = await supabase
      .from('rewards')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw new Error(error.message)
    // Optimistic: remove from both slices immediately
    set((s) => ({
      rewards: s.rewards.filter((r) => r.id !== id),
      allRewards: s.allRewards.filter((r) => r.id !== id),
    }))
  },

  // ── Realtime ─────────────────────────────────────────────────────────────
  subscribeToChanges: () => {
    const channel = supabase
      .channel('rewards-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rewards' },
        (payload) => {
          const updated = payload.new as Reward
          if (!updated.is_active) {
            set((s) => ({
              rewards: s.rewards.filter((r) => r.id !== updated.id),
              allRewards: s.allRewards.filter((r) => r.id !== updated.id),
            }))
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[rewards-realtime] channel error', status, err)
        }
      })
    return () => { void supabase.removeChannel(channel) }
  },

  // ── Redeem ───────────────────────────────────────────────────────────────
  redeemReward: async (rewardId) => {
    const user = useAuthStore.getState().user
    if (!user) return { success: false, error: 'Not authenticated' }

    // redeem_reward exists in DB but not yet in generated types — cast is intentional
    const { error } = await supabase.rpc('redeem_reward' as never, {
      p_reward_id: rewardId,
      p_user_id: user.id,
    } as never)
    if (error) return { success: false, error: error.message }

    const [, refreshedRewards] = await Promise.all([
      usePointsStore.getState().loadTotalPoints(),
      supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true }),
    ])
    if (!refreshedRewards.error) {
      set({ rewards: (refreshedRewards.data ?? []) as Reward[] })
    }
    return { success: true }
  },

  // ── Redemption history ───────────────────────────────────────────────────
  loadRedemptions: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('reward_redemptions')
        .select('*')
        .eq('user_id', user.id)
        .order('redeemed_at', { ascending: false })
      if (error) throw error
      set({ redemptions: (data ?? []) as RewardRedemption[] })
    } catch (err) {
      set({ redemptions: [], error: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ isLoading: false })
    }
  },
}))
