import { create } from 'zustand'
import type { Reward, RewardRedemption } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'
import { usePointsStore } from './usePointsStore'

interface RewardsState {
  rewards: Reward[]
  redemptions: RewardRedemption[]
  isLoading: boolean
  error: string | null

  fetchRewards: () => Promise<void>
  deleteReward: (id: string) => Promise<void>
  subscribeToChanges: () => () => void
  redeemReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>
  loadRedemptions: () => Promise<void>
}

export const useRewardsStore = create<RewardsState>((set) => ({
  rewards: [],
  redemptions: [],
  isLoading: false,
  error: null,

  fetchRewards: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ rewards: (data ?? []) as Reward[], isLoading: false })
  },

  deleteReward: async (id) => {
    const { error } = await supabase
      .from('rewards')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error
    set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) }))
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('rewards-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rewards' },
        (payload) => {
          const updated = payload.new as Reward
          if (!updated.is_active) {
            set((s) => ({ rewards: s.rewards.filter((r) => r.id !== updated.id) }))
          }
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  },

  redeemReward: async (rewardId) => {
    const user = useAuthStore.getState().user
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId, p_user_id: user.id })
    if (error) {
      return { success: false, error: error.message }
    }

    // Refresh spendable points and rewards list after successful redemption
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

  loadRedemptions: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('reward_redemptions')
      .select('*')
      .eq('user_id', user.id)
      .order('redeemed_at', { ascending: false })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ redemptions: (data ?? []) as RewardRedemption[], isLoading: false })
  },
}))
