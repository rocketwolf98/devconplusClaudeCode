import { create } from 'zustand'
import type { Job } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'

interface JobsState {
  jobs: Job[]
  savedIds: string[]
  isLoading: boolean
  error: string | null

  fetchJobs: () => Promise<void>
  toggleSave: (id: string) => void
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  savedIds: [],
  isLoading: false,
  error: null,

  fetchJobs: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .order('posted_at', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ jobs: (data ?? []) as Job[], isLoading: false })
  },

  toggleSave: (id) => {
    const { savedIds } = get()
    set({
      savedIds: savedIds.includes(id)
        ? savedIds.filter((s) => s !== id)
        : [...savedIds, id],
    })
  },
}))
