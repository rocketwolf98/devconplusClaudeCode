import { create } from 'zustand'

export interface OrganizerUser {
  id: string
  full_name: string
  email: string
  chapter: string
  role: 'chapter_officer' | 'hq_admin'
  initials: string
  avatar_url: string | null
}

interface OrgAuthState {
  user: OrganizerUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (patch: Partial<Pick<OrganizerUser, 'full_name' | 'avatar_url'>>) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const MOCK_ORGANIZER: OrganizerUser = {
  id: 'org-juan-dela-cruz',
  full_name: 'Juan dela Cruz',
  email: 'juan.delacruz@devcon.ph',
  chapter: 'Manila',
  role: 'hq_admin',
  initials: 'JC',
  avatar_url: null,
}

export const useOrgAuthStore = create<OrgAuthState>((set, get) => ({
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

  updateProfile: (patch) => {
    const current = get().user
    if (!current) return
    set({
      user: {
        ...current,
        ...patch,
        initials: patch.full_name ? getInitials(patch.full_name) : current.initials,
      },
    })
  },
}))
