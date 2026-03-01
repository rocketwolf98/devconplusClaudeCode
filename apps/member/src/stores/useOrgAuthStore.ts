import { create } from 'zustand'

export interface OrganizerUser {
  id: string
  full_name: string
  email: string
  chapter: string
  role: 'chapter_officer' | 'hq_admin'
  initials: string
}

interface OrgAuthState {
  user: OrganizerUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const MOCK_ORGANIZER: OrganizerUser = {
  id: 'org-juan-dela-cruz',
  full_name: 'Juan dela Cruz',
  email: 'juan.delacruz@devcon.ph',
  chapter: 'Manila',
  role: 'hq_admin',
  initials: 'JC',
}

export const useOrgAuthStore = create<OrgAuthState>((set) => ({
  user: null, // starts logged out — set on valid organizer code entry

  isLoading: false,

  login: async (_email: string, _password: string) => {
    set({ isLoading: true })
    // TODO: replace with Supabase auth + role validation
    await new Promise((r) => setTimeout(r, 400))
    set({ user: MOCK_ORGANIZER, isLoading: false })
  },

  logout: () => {
    set({ user: null })
  },
}))
