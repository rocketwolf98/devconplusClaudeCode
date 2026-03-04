import { create } from 'zustand'
import type { Reward } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'

interface RewardsState {
  rewards: Reward[]
  isLoading: boolean
  error: string | null

  fetchRewards: () => Promise<void>
  deleteReward: (id: string) => Promise<void>
  subscribeToChanges: () => () => void
}

export const useRewardsStore = create<RewardsState>((set) => ({
  rewards: [],
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
}))
