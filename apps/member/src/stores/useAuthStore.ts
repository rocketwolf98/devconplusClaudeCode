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

type UpgradeResult = 'submitted' | 'invalid_code' | 'wrong_chapter' | 'already_pending'

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
    username: string,
    school_or_company?: string,
    chapter_id?: string
  ) => Promise<{ emailConfirmationPending: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setOrganizerSession: (val: boolean) => void
  updateProfile: (
    patch: Partial<Pick<Profile, 'full_name' | 'username' | 'school_or_company' | 'avatar_url' | 'chapter_id'>>
  ) => Promise<void>
  updateEmail: (newEmail: string, currentPassword: string) => Promise<void>
  updatePassword: (newPassword: string, currentPassword: string) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  deleteAccount: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  requestOrganizerUpgrade: (code: string) => Promise<UpgradeResult>
  checkUsernameAvailable: (username: string) => Promise<boolean>
}

async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') {
    console.error('[fetchProfileById] error:', error.code, error.message)
  }
  return data ?? null
}

async function ensureProfile(userId: string, meta: Record<string, string | null>): Promise<Profile | null> {
  const existing = await fetchProfileById(userId)
  if (existing) return existing

  // Profile row missing — create it now (handles cases before DB trigger is deployed)
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: meta.full_name ?? meta.email?.split('@')[0] ?? 'User',
      username: meta.username ?? null,
      email: meta.email ?? '',
      school_or_company: meta.school_or_company ?? null,
      chapter_id: meta.chapter_id ?? null,
      role: 'member',
      total_points: 0,
    })
    .select()
    .single()
  if (error) {
    console.error('[ensureProfile] insert error:', error.code, error.message)
  }
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
      const meta = { ...session.user.user_metadata, email: session.user.email ?? null } as Record<string, string | null>
      const profile = await ensureProfile(session.user.id, meta)
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
        const meta = { ...session.user.user_metadata, email: session.user.email ?? null } as Record<string, string | null>
        const profile = await ensureProfile(session.user.id, meta)
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

  signUp: async (email, password, full_name, username, school_or_company, chapter_id) => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-confirm`,
        data: {
          full_name,
          username,
          school_or_company: school_or_company ?? null,
          chapter_id: chapter_id ?? null,
        },
      },
    })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    // If session is immediately available (email confirmation disabled),
    // eagerly create + set the profile so callers can read user.role right away
    if (data.session?.user) {
      const meta: Record<string, string | null> = {
        full_name,
        username,
        email,
        school_or_company: school_or_company ?? null,
        chapter_id: chapter_id ?? null,
      }
      const profile = await ensureProfile(data.session.user.id, meta)
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
    set({ isLoading: false })
    return { emailConfirmationPending: !data.session }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    // Eagerly fetch/create profile so callers can read user.role immediately after signIn() returns
    if (data.session?.user) {
      const meta = { ...data.session.user.user_metadata, email: data.session.user.email ?? null } as Record<string, string | null>
      const profile = await ensureProfile(data.session.user.id, meta)
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
    set({ isLoading: false })
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
    const chapterName = patch.chapter_id !== undefined
      ? await fetchChapterName(patch.chapter_id ?? null)
      : get().chapterName
    set({
      user: updated,
      initials: patch.full_name ? getInitials(patch.full_name) : get().initials,
      chapterName,
    })
  },

  updateEmail: async (newEmail, currentPassword) => {
    const current = get().user
    if (!current) throw new Error('Not authenticated')
    // Re-authenticate first
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: current.email,
      password: currentPassword,
    })
    if (authErr) throw new Error('Incorrect password')
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) throw error
  },

  uploadAvatar: async (file) => {
    const current = get().user
    if (!current) throw new Error('Not authenticated')
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${current.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  },

  deleteAccount: async () => {
    const { error } = await supabase.rpc('delete_own_account')
    if (error) throw error
    await supabase.auth.signOut()
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

  updatePassword: async (newPassword, currentPassword) => {
    const current = get().user
    if (!current) throw new Error('Not authenticated')
    // Re-authenticate first
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: current.email,
      password: currentPassword,
    })
    if (authErr) throw new Error('Incorrect password')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  requestOrganizerUpgrade: async (code) => {
    const current = get().user
    if (!current) throw new Error('Not authenticated')

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('organizer_upgrade_requests')
      .select('id, status')
      .eq('user_id', current.id)
      .eq('status', 'pending')
      .maybeSingle()
    if (existing) return 'already_pending'

    // Validate the code
    const { data: codeRow } = await supabase
      .from('organizer_codes')
      .select('id, chapter_id, assigned_role, is_active')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()
    if (!codeRow) return 'invalid_code'

    // Chapter match check: HQ codes (null chapter_id) are valid for anyone
    if (codeRow.chapter_id !== null && codeRow.chapter_id !== current.chapter_id) {
      return 'wrong_chapter'
    }

    // Submit upgrade request
    const { error } = await supabase
      .from('organizer_upgrade_requests')
      .insert({
        user_id: current.id,
        organizer_code: code.toUpperCase(),
        chapter_id: codeRow.chapter_id,
        requested_role: codeRow.assigned_role,
        status: 'pending',
      })
    if (error) throw error

    // Store pending state on profile so it's visible elsewhere
    await supabase
      .from('profiles')
      .update({
        pending_role: codeRow.assigned_role,
        pending_chapter_id: codeRow.chapter_id,
      })
      .eq('id', current.id)

    set({ user: { ...current, pending_role: codeRow.assigned_role, pending_chapter_id: codeRow.chapter_id } })
    return 'submitted'
  },

  checkUsernameAvailable: async (username) => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()
    return !data
  },
}))
