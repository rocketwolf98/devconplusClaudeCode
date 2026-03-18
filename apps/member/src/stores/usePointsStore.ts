import { create } from 'zustand'
import type { PointTransaction } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'

interface PointsState {
  totalPoints: number
  transactions: PointTransaction[]
  isLoading: boolean
  error: string | null

  fetchPoints: (userId: string) => Promise<void>
}

export const usePointsStore = create<PointsState>((set) => ({
  totalPoints: 0,
  transactions: [],
  isLoading: false,
  error: null,

  fetchPoints: async (userId) => {
    set({ isLoading: true, error: null })
    const [txResult, profileResult] = await Promise.all([
      supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('spendable_points')
        .eq('id', userId)
        .single(),
    ])
    if (txResult.error) {
      set({ error: txResult.error.message, isLoading: false })
      return
    }
    set({
      transactions: (txResult.data ?? []) as PointTransaction[],
      totalPoints:  profileResult.data?.spendable_points ?? 0,
      isLoading:    false,
    })
  },
}))
