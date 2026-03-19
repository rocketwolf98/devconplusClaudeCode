import { create } from 'zustand'
import type { PointTransaction } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

interface PointsState {
  spendablePoints: number
  lifetimePoints: number
  prestigeUnlocked: boolean
  transactions: PointTransaction[]
  isLoading: boolean
  error: string | null

  loadTransactions: () => Promise<void>
  loadTotalPoints: () => Promise<void>
}

export const usePointsStore = create<PointsState>((set) => ({
  spendablePoints: 0,
  lifetimePoints: 0,
  prestigeUnlocked: false,
  transactions: [],
  isLoading: false,
  error: null,

  loadTransactions: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({
      transactions: (data ?? []) as PointTransaction[],
      isLoading: false,
    })
  },

  loadTotalPoints: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('profiles')
      .select('spendable_points, lifetime_points')
      .eq('id', user.id)
      .single()
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    const spendablePoints = data?.spendable_points ?? 0
    const lifetimePoints = data?.lifetime_points ?? 0
    set({
      spendablePoints,
      lifetimePoints,
      prestigeUnlocked: lifetimePoints >= 3000,
      isLoading: false,
    })
  },
}))
