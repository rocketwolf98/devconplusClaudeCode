import { create } from 'zustand'
import type { PointTransaction } from '@devcon-plus/supabase'
import { TRANSACTIONS, MOCK_PROFILE } from '@devcon-plus/supabase'

interface PointsState {
  totalPoints: number
  transactions: PointTransaction[]
}

export const usePointsStore = create<PointsState>(() => ({
  totalPoints: MOCK_PROFILE.total_points,
  transactions: TRANSACTIONS,
}))
