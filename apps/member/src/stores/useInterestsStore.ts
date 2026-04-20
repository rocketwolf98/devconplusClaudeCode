import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export interface InterestOption {
  id: number
  category: 'interest' | 'tech_stack' | 'community_role'
  label: string
  emoji: string | null
}

interface InterestsState {
  options: InterestOption[]
  isLoading: boolean
  error: string | null
  fetchOptions: () => Promise<void>
  saveSelections: (
    interests: number[],
    techStack: number[],
    communityRoles: number[]
  ) => Promise<void>
}

export const useInterestsStore = create<InterestsState>((set) => ({
  options: [],
  isLoading: false,
  error: null,

  fetchOptions: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('interest_options')
      .select('id, category, label, emoji')
      .order('id')
    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }
    set({
      options: (data ?? []).map((row) => ({
        ...row,
        category: row.category as 'interest' | 'tech_stack' | 'community_role',
      })),
      isLoading: false,
    })
  },

  saveSelections: async (interests, techStack, communityRoles) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        interests,
        tech_stack: techStack,
        community_roles: communityRoles,
      })
      .eq('id', user.id)

    if (error) {
      console.error('[useInterestsStore] saveSelections error:', error)
      // Still navigate — user can edit from Profile later
      return
    }

    // Re-initialize auth store so user.interests reflects the new values
    await useAuthStore.getState().initialize()
  },
}))
