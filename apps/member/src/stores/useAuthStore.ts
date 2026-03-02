import { create } from 'zustand'
import type { Profile } from '@devcon-plus/supabase'
import { MOCK_PROFILE } from '@devcon-plus/supabase'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

interface AuthState {
  user: Profile | null
  initials: string
  isLoading: boolean
  isOrganizerSession: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  setOrganizerSession: (val: boolean) => void
  updateProfile: (patch: Partial<Pick<Profile, 'full_name' | 'school_or_company' | 'avatar_url'>>) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

  updateProfile: (patch) => {
    const current = get().user
    if (!current) return
    const updated = { ...current, ...patch }
    set({
      user: updated,
      initials: patch.full_name ? getInitials(patch.full_name) : get().initials,
    })
  },
}))
