import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

export interface OrgVolunteerApplication {
  id: string
  event_id: string
  event_title: string
  user_id: string
  member_name: string
  member_email: string
  school_or_company: string
  reason: string
  phone_number: string | null
  social_media_handle: string | null
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
}

interface OrgVolunteerState {
  applications: OrgVolunteerApplication[]
  loading: boolean
  error: string | null
  loadApplications: (chapterId: string) => Promise<void>
  approveApplication: (id: string) => Promise<{ success: boolean; error?: string }>
  rejectApplication: (id: string) => Promise<{ success: boolean; error?: string }>
  revertApplication: (id: string) => Promise<{ success: boolean; error?: string }>
}

export const useOrgVolunteerStore = create<OrgVolunteerState>((set, get) => ({
  applications: [],
  loading: false,
  error: null,

  loadApplications: async (chapterId) => {
    set({ loading: true, error: null })

    // Step 1: get event IDs belonging to this chapter
    const { data: eventRows, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('chapter_id', chapterId)

    if (eventError) {
      set({ error: eventError.message, loading: false })
      return
    }

    const eventIds = (eventRows ?? []).map((e) => e.id)
    if (eventIds.length === 0) {
      set({ applications: [], loading: false })
      return
    }

    // Step 2: fetch applications filtered by those event IDs
    const { data, error } = await supabase
      .from('volunteer_applications')
      .select(`
        id,
        event_id,
        user_id,
        reason,
        phone_number,
        social_media_handle,
        status,
        applied_at,
        reviewed_at,
        reviewed_by,
        events(title),
        profiles(full_name, email, school_or_company)
      `)
      .in('event_id', eventIds)
      .order('applied_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    const mapped: OrgVolunteerApplication[] = (data ?? []).map((row) => {
      const ev = Array.isArray(row.events) ? row.events[0] : row.events
      const p  = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const evObj = ev as { title?: string } | null
      const pObj  = p  as { full_name?: string; email?: string; school_or_company?: string } | null
      return {
        id:                  row.id,
        event_id:            row.event_id,
        event_title:         evObj?.title ?? '',
        user_id:             row.user_id,
        member_name:         pObj?.full_name ?? 'Unknown',
        member_email:        pObj?.email ?? '',
        school_or_company:   pObj?.school_or_company ?? '',
        reason:              row.reason,
        phone_number:        row.phone_number ?? null,
        social_media_handle: row.social_media_handle ?? null,
        status:              row.status as OrgVolunteerApplication['status'],
        applied_at:          row.applied_at ?? null,
        reviewed_at:         row.reviewed_at ?? null,
        reviewed_by:         row.reviewed_by ?? null,
      }
    })
    set({ applications: mapped, loading: false })
  },

  // Use the RPC — it awards points atomically via SECURITY DEFINER
  approveApplication: async (id) => {
    const reviewerId = useAuthStore.getState().user?.id
    if (!reviewerId) return { success: false, error: 'Not authenticated' }

    const { data, error } = await supabase
      .rpc('approve_volunteer_application', {
        p_application_id: id,
        p_organizer_id:   reviewerId,
      })

    if (error) return { success: false, error: error.message }

    const result = data as { success: boolean; error?: string } | null
    if (!result?.success) return { success: false, error: result?.error ?? 'RPC failed' }

    // Mutate local state on confirmed success
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id
          ? { ...a, status: 'approved' as const, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }
          : a
      ),
    }))
    return { success: true }
  },

  rejectApplication: async (id) => {
    const reviewerId = useAuthStore.getState().user?.id
    if (!reviewerId) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('volunteer_applications')
      .update({
        status:      'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id
          ? { ...a, status: 'rejected' as const, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }
          : a
      ),
    }))
    return { success: true }
  },

  revertApplication: async (id) => {
    const reviewerId = useAuthStore.getState().user?.id
    if (!reviewerId) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('volunteer_applications')
      .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id
          ? { ...a, status: 'pending' as const, reviewed_by: null, reviewed_at: null }
          : a
      ),
    }))
    return { success: true }
  },
}))
