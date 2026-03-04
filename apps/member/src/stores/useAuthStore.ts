import { create } from 'zustand'
import type { Profile } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'

const ORGANIZER_ROLES = ['chapter_officer', 'hq_admin', 'super_admin'] as const
type OrganizerRole = typeof ORGANIZER_ROLES[number]

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
  chapterName: string | null
  isLoading: boolean
  isInitialized: boolean
  isOrganizerSession: boolean
  error: string | null

  initialize: () => Promise<void>
  signUp: (
    email: string,
    password: string,
    full_name: string,
    school_or_company?: string
  ) => Promise<{ emailConfirmationPending: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setOrganizerSession: (val: boolean) => void
  updateProfile: (
    patch: Partial<Pick<Profile, 'full_name' | 'school_or_company' | 'avatar_url'>>
  ) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

async function fetchChapterName(chapterId: string | null): Promise<string | null> {
  if (!chapterId) return null
  const { data } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', chapterId)
    .single()
  return data?.name ?? null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initials: '',
  chapterName: null,
  isLoading: false,
  isInitialized: false,
  isOrganizerSession: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true })

    // Restore existing session on page load
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await fetchProfileById(session.user.id)
      if (profile) {
        const chapterName = await fetchChapterName(profile.chapter_id)
        set({
          user: profile,
          initials: getInitials(profile.full_name),
          chapterName,
          isOrganizerSession: ORGANIZER_ROLES.includes(profile.role as OrganizerRole),
        })
      }
    }

    set({ isLoading: false, isInitialized: true })

    // Subscribe to future auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null, initials: '', chapterName: null, isOrganizerSession: false })
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const profile = await fetchProfileById(session.user.id)
        if (profile) {
          const chapterName = await fetchChapterName(profile.chapter_id)
          set({
            user: profile,
            initials: getInitials(profile.full_name),
            chapterName,
            isOrganizerSession: ORGANIZER_ROLES.includes(profile.role as OrganizerRole),
          })
        }
      }
    })
  },

  signUp: async (email, password, full_name, school_or_company) => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-confirm`,
        data: {
          full_name,
          school_or_company: school_or_company ?? null,
        },
      },
    })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    set({ isLoading: false })
    return { emailConfirmationPending: !data.session }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    set({ isLoading: false })
    // onAuthStateChange fires SIGNED_IN → profile fetched automatically
  },

  signOut: async () => {
    await supabase.auth.signOut()
    // onAuthStateChange fires SIGNED_OUT → clears user in store
  },

  setOrganizerSession: (val) => {
    set({ isOrganizerSession: val })
  },

  updateProfile: async (patch) => {
    const current = get().user
    if (!current) return
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', current.id)
    if (error) throw error
    const updated = { ...current, ...patch }
    set({
      user: updated,
      initials: patch.full_name ? getInitials(patch.full_name) : get().initials,
    })
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    set({ isLoading: false })
  },

  updatePassword: async (password) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    set({ isLoading: false })
  },
}))
