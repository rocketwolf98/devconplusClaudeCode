import { create } from 'zustand'
import type { Job } from '@devcon-plus/supabase'
import { JOBS } from '@devcon-plus/supabase'

interface JobsState {
  jobs: Job[]
  savedIds: string[]
  toggleSave: (id: string) => void
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: JOBS,
  savedIds: [],

  toggleSave: (id: string) => {
    const { savedIds } = get()
    set({
      savedIds: savedIds.includes(id)
        ? savedIds.filter((s) => s !== id)
        : [...savedIds, id],
    })
  },
}))
