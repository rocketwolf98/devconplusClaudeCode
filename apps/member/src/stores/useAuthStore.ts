import { create } from 'zustand'
import type { Profile } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'

// Calls the check-rate-limit edge function.
// Returns { allowed, retryAfterSeconds? }.
// On any network/server error → { allowed: true } (fail open — GoTrue + RLS are final backstops).
// token: pass the user's access_token for user-keyed buckets (org_upgrade).
async function callRateLimit(
  bucket: string,
  extra?: { email?: string; token?: string }
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (extra?.token) headers['Authorization'] = `Bearer ${extra.token}`
    const { token: _unused, ...body } = extra ?? {}
    const res = await fetch(`${supabaseUrl}/functions/v1/check-rate-limit`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ bucket, ...body }),
    })
    if (!res.ok && res.status !== 429) return { allowed: true }
    return await res.json() as { allowed: boolean; retryAfterSeconds?: number }
  } catch {
    return { allowed: true }
  }
}

export const ORGANIZER_ROLES = ['chapter_officer', 'hq_admin', 'super_admin'] as const
export type OrganizerRole = typeof ORGANIZER_ROLES[number]

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
    chapter_id: string,
    school_or_company?: string,
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
  return (data ?? null) as unknown as Profile | null
}

async function ensureProfile(userId: string, meta: Record<string, string | null>): Promise<Profile | null> {
  // Fetch first — avoids NOT NULL violations on chapter_id for returning users
  // who signed up before chapter_id became required.
  const existing = await fetchProfileById(userId)

  if (existing) {
    // Patch any null fields the trigger left empty (username, chapter_id, school_or_company).
    const patch: Partial<Pick<Profile, 'username' | 'chapter_id' | 'school_or_company'>> = {}
    if (!existing.username && meta.username)                    patch.username          = meta.username
    if (!existing.chapter_id && meta.chapter_id)               patch.chapter_id        = meta.chapter_id
    if (!existing.school_or_company && meta.school_or_company) patch.school_or_company = meta.school_or_company

    if (Object.keys(patch).length === 0) return existing

    const { error: patchErr } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
    if (patchErr) {
      console.error('[ensureProfile] patch error:', patchErr.code, patchErr.message)
      return existing  // return unpatched DB row — don't diverge in-memory state from DB
    }

    return { ...existing, ...patch }
  }

  // No profile yet — INSERT (new sign-up before trigger fires, or trigger was skipped).
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: meta.full_name ?? meta.email?.split('@')[0] ?? 'User',
      username: meta.username ?? null,
      email: meta.email ?? '',
      school_or_company: meta.school_or_company ?? null,
      chapter_id: meta.chapter_id ?? '',
      role: 'member',
      spendable_points: 0,
      lifetime_points: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[ensureProfile] insert error:', error.code, error.message)
    return null
  }

  return (data ?? null) as unknown as Profile | null
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

// Applies a fetched profile to the store; shared by initialize, signIn, signUp, and onAuthStateChange.
async function applyProfile(profile: Profile, set: (partial: Partial<AuthState>) => void): Promise<void> {
  const chapterName = await fetchChapterName(profile.chapter_id)
  set({
    user: profile,
    initials: getInitials(profile.full_name),
    chapterName,
    isOrganizerSession: ORGANIZER_ROLES.includes(profile.role as OrganizerRole),
  })
}

// Holds the auth listener cleanup so initialize() can safely re-register without leaking.
let authUnsubscribe: (() => void) | null = null

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
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
    // Re-entry guard — prevents double-init from React StrictMode or accidental duplicate calls
    if (get().isLoading || get().isInitialized) return
    set({ isLoading: true })

    // IMPORTANT: call getSession() BEFORE registering onAuthStateChange.
    // Supabase JS v2 awaits all subscriber callbacks inside notifyAllSubscribers().
    // If onAuthStateChange is registered first and the saved token is expired, Supabase
    // fires TOKEN_REFRESHED → our handler calls ensureProfile() → PostgREST calls getSession()
    // internally → getSession() waits for initializePromise → initializePromise waits for
    // our callback to finish → circular wait (deadlock) → isInitialized never becomes true.
    // With getSession() first, initializePromise is already resolved before the listener
    // is registered, so subsequent PostgREST calls inside listener callbacks never block.
    // TOKEN_REFRESH_FAILED during the initial getSession() surfaces as sessionError below.
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        // Stale / corrupt token in storage — clear it and bail to sign-in
        await supabase.auth.signOut()
        set({ isLoading: false, isInitialized: true })
        return
      }
      if (session?.user) {
        const meta = { ...session.user.user_metadata, email: session.user.email ?? null } as Record<string, string | null>
        const profile = await ensureProfile(session.user.id, meta)
        if (profile) await applyProfile(profile, set)
      }
    } catch {
      // getSession() itself threw (e.g. corrupt storage) — clear and bail
      await supabase.auth.signOut()
      set({ isLoading: false, isInitialized: true })
      return
    }

    // Register the listener AFTER getSession() so initializePromise is already resolved.
    if (authUnsubscribe) authUnsubscribe()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event as string) === 'TOKEN_REFRESH_FAILED') {
        // Refresh token invalid / revoked — clear stale session and redirect to sign-in
        await supabase.auth.signOut()
        set({ user: null, initials: '', chapterName: null, isOrganizerSession: false })
        window.location.replace('/sign-in')
        return
      }
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null, initials: '', chapterName: null, isOrganizerSession: false })
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const meta = { ...session.user.user_metadata, email: session.user.email ?? null } as Record<string, string | null>
        const profile = await ensureProfile(session.user.id, meta)
        if (profile) await applyProfile(profile, set)
      }
    })
    authUnsubscribe = () => subscription.unsubscribe()

    set({ isLoading: false, isInitialized: true })
  },

  signUp: async (email, password, full_name, username, chapter_id, school_or_company) => {
    set({ isLoading: true, error: null })
    // Advisory rate limit: 3 signups per IP per hour. Cannot block direct GoTrue calls.
    // Deferred CAPTCHA (Cloudflare Turnstile) will close this gap at infrastructure level.
    const signupLimit = await callRateLimit('signup')
    if (!signupLimit.allowed) {
      const secs = signupLimit.retryAfterSeconds ?? 3600
      const err = new Error(`Too many accounts created from this network. Please try again in ${Math.ceil(secs / 60)} minutes.`)
      set({ isLoading: false, error: err.message })
      throw err
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-confirm`,
        data: {
          full_name,
          username,
          school_or_company: school_or_company || null,
          chapter_id: chapter_id || null,
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
        school_or_company: school_or_company || null,
        chapter_id: chapter_id || null,
      }
      const profile = await ensureProfile(data.session.user.id, meta)
      if (profile) await applyProfile(profile, set)
    }
    set({ isLoading: false })
    return { emailConfirmationPending: !data.session }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })

    // Dual-key rate limit: per-email + per-IP, in parallel for minimal latency.
    // Known trade-off: email key is user-supplied and unverified pre-auth — an attacker
    // could exhaust a victim's login bucket. Mitigated by the IP bucket. Accepted for MVP.
    const [emailLimit, ipLimit] = await Promise.all([
      callRateLimit('login', { email }),
      callRateLimit('login_ip'),
    ])

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const secs = Math.max(
        emailLimit.retryAfterSeconds ?? 0,
        ipLimit.retryAfterSeconds ?? 0,
      ) || 300
      const err = new Error(`Too many login attempts. Please wait ${secs} seconds before trying again.`)
      ;(err as Error & { retryAfterSeconds: number }).retryAfterSeconds = secs
      set({ isLoading: false, error: err.message })
      throw err
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ isLoading: false, error: error.message })
      throw error
    }
    // Eagerly fetch/create profile so callers can read user.role immediately after signIn() returns
    if (data.session?.user) {
      const meta = { ...data.session.user.user_metadata, email: data.session.user.email ?? null } as Record<string, string | null>
      const profile = await ensureProfile(data.session.user.id, meta)
      if (profile) await applyProfile(profile, set)
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
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) throw new Error('Only image files are allowed')
    if (file.size > 10 * 1024 * 1024) throw new Error('Image must be under 10 MB')
    const ext = MIME_TO_EXT[file.type] ?? 'jpg'
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

    // Rate limit: 3 attempts per user per 25h — prevents organizer code brute-forcing.
    // Requires JWT (org_upgrade is a user-keyed bucket in the edge function).
    const { data: { session } } = await supabase.auth.getSession()
    const upgradeLimit = await callRateLimit('org_upgrade', { token: session?.access_token })
    if (!upgradeLimit.allowed) {
      const secs = upgradeLimit.retryAfterSeconds ?? 86400
      const hours = Math.ceil(secs / 3600)
      throw new Error(
        `You've reached the daily limit for organizer code attempts. Try again in ${hours} hour${hours !== 1 ? 's' : ''}.`
      )
    }

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
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        pending_role: codeRow.assigned_role,
        pending_chapter_id: codeRow.chapter_id,
      })
      .eq('id', current.id)
    if (updateErr) throw updateErr

    set({ user: { ...current, pending_role: codeRow.assigned_role, pending_chapter_id: codeRow.chapter_id } })
    return 'submitted'
  },

  checkUsernameAvailable: async (username) => {
    // Rate limit: 30 checks per IP per 60s. Blocked → return false (silent degradation —
    // shows username as "unavailable", no error message shown to the user).
    const limit = await callRateLimit('username_check')
    if (!limit.allowed) return false

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()
    return !data
  },
}))
