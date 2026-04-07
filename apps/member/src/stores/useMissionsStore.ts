import { create } from 'zustand'
import type { Mission, MissionParticipant, MissionSubmission } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'

interface MissionsState {
  missions: Mission[]
  participants: MissionParticipant[]
  submissions: MissionSubmission[]
  isLoading: boolean
  error: string | null

  fetchAll: () => Promise<void>
  startMission: (missionId: string, userId: string) => Promise<void>
  submitMission: (missionId: string, userId: string, prLink: string) => Promise<void>
  subscribeToChanges: () => () => void
}

export const useMissionsStore = create<MissionsState>((set, get) => ({
  missions: [],
  participants: [],
  submissions: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null })
    const [mRes, pRes, sRes] = await Promise.all([
      supabase.from('missions').select('*').order('created_at', { ascending: false }),
      supabase.from('mission_participants').select('*'),
      supabase.from('mission_submissions').select('*'),
    ])
    if (mRes.error) {
      set({ error: mRes.error.message, isLoading: false })
      return
    }
    set({
      missions:     (mRes.data ?? []) as Mission[],
      participants: (pRes.data ?? []) as MissionParticipant[],
      submissions:  (sRes.data ?? []) as MissionSubmission[],
      isLoading: false,
    })
  },

  startMission: async (missionId, userId) => {
    const { error } = await supabase
      .from('mission_participants')
      .insert({ mission_id: missionId, user_id: userId })
    if (error) throw error
    // Optimistic — real-time will also arrive but dedup guard handles that
    set((s) => ({
      participants: s.participants.some(
        (p) => p.mission_id === missionId && p.user_id === userId
      )
        ? s.participants
        : [...s.participants, { mission_id: missionId, user_id: userId, joined_at: new Date().toISOString() }],
    }))
  },

  submitMission: async (missionId, userId, prLink) => {
    const existing = get().submissions.find(
      (s) => s.mission_id === missionId && s.user_id === userId
    )
    const now = new Date().toISOString()
    if (existing) {
      const { error } = await supabase
        .from('mission_submissions')
        .update({ pr_link: prLink, submitted_at: now })
        .eq('id', existing.id)
      if (error) throw error
      set((s) => ({
        submissions: s.submissions.map((sub) =>
          sub.id === existing.id ? { ...sub, pr_link: prLink, submitted_at: now } : sub
        ),
      }))
    } else {
      const { data, error } = await supabase
        .from('mission_submissions')
        .insert({ mission_id: missionId, user_id: userId, pr_link: prLink })
        .select()
        .single()
      if (error) throw error
      set((s) => ({ submissions: [...s.submissions, data as MissionSubmission] }))
    }
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('missions-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mission_participants' },
        (payload: { new: MissionParticipant }) => {
          const row = payload.new
          set((s) => ({
            participants: s.participants.some(
              (p) => p.mission_id === row.mission_id && p.user_id === row.user_id
            )
              ? s.participants
              : [...s.participants, row],
          }))
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mission_participants' },
        (payload: { old: Partial<MissionParticipant> }) => {
          const row = payload.old
          set((s) => ({
            participants: s.participants.filter(
              (p) => !(p.mission_id === row.mission_id && p.user_id === row.user_id)
            ),
          }))
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mission_submissions' },
        (payload: { new: MissionSubmission }) => {
          const row = payload.new
          set((s) => ({
            submissions: s.submissions.some((sub) => sub.id === row.id)
              ? s.submissions
              : [...s.submissions, row],
          }))
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mission_submissions' },
        (payload: { new: MissionSubmission }) => {
          const row = payload.new
          set((s) => ({
            submissions: s.submissions.map((sub) => (sub.id === row.id ? row : sub)),
          }))
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'missions' },
        (payload: { new: Mission }) => {
          const row = payload.new
          set((s) => ({
            missions: s.missions.map((m) => (m.id === row.id ? row : m)),
          }))
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[missions-realtime] channel error', status, err)
        }
      })
    return () => { void supabase.removeChannel(channel) }
  },
}))

