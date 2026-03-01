import { create } from 'zustand'
import type { Profile } from '@devcon-plus/supabase'
import { MOCK_PROFILE } from '@devcon-plus/supabase'

interface AuthState {
  user: Profile | null
  initials: string
  isLoading: boolean
  isOrganizerSession: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  setOrganizerSession: (val: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: MOCK_PROFILE, // mock: pre-authenticated
  initials: 'MS',
  isLoading: false,
  isOrganizerSession: false,

  signIn: async (_email: string, _password: string) => {
    set({ isLoading: true })
    // TODO: replace with Supabase auth call
    await new Promise((r) => setTimeout(r, 500))
    set({ user: MOCK_PROFILE, initials: 'MS', isLoading: false })
  },

  signOut: () => {
    set({ user: null, initials: '', isOrganizerSession: false })
  },

  setOrganizerSession: (val: boolean) => {
    set({ isOrganizerSession: val })
  },
}))
