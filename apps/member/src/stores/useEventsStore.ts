import { create } from 'zustand'
import type { Event, EventRegistration, DevconCategory } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'

// Alias — checked_in: boolean | null is already part of EventRegistration
type FullRegistration = EventRegistration

interface CreateEventPayload {
  title: string
  description: string
  location: string
  event_date: string
  end_date: string | null
  category: 'tech_talk' | 'hackathon' | 'workshop' | 'brown_bag' | 'summit' | 'social' | 'networking'
  // TODO: add devcon_category column to events table before going live with Supabase
  devcon_category: DevconCategory | null
  tags: string[]
  visibility: 'public' | 'unlisted' | 'draft'
  is_free: boolean
  ticket_price_php: number
  capacity: number | null
  points_value: number
  requires_approval: boolean
  cover_image_url: string | null
  chapter_id: string
  created_by: string
}

export interface UpdateEventPayload {
  title?: string
  description?: string
  location?: string
  event_date?: string
  end_date?: string | null
  category?: 'tech_talk' | 'hackathon' | 'workshop' | 'brown_bag' | 'summit' | 'social' | 'networking'
  devcon_category?: DevconCategory | null
  tags?: string[]
  visibility?: 'public' | 'unlisted' | 'draft'
  is_free?: boolean
  ticket_price_php?: number
  capacity?: number | null
  points_value?: number
  requires_approval?: boolean
  cover_image_url?: string | null
}

interface EventsState {
  events: Event[]
  registrations: FullRegistration[]
  isLoading: boolean
  error: string | null

  fetchEvents: () => Promise<void>
  createEvent: (payload: CreateEventPayload) => Promise<Event>
  deleteEvent: (id: string) => Promise<void>
  updateEvent: (id: string, payload: UpdateEventPayload) => Promise<Event>
  subscribeToChanges: () => () => void
  fetchRegistrations: (userId: string) => Promise<void>
  register: (eventId: string, userId: string) => Promise<void>
  cancelRegistration: (regId: string) => Promise<void>
  subscribeToRegistration: (
    registrationId: string,
    onApproved: (reg: FullRegistration) => void
  ) => () => void
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  registrations: [],
  isLoading: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ events: (data ?? []) as Event[], isLoading: false })
  },

  createEvent: async (payload) => {
    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    const newEvent = data as Event
    set((s) => ({
      events: [...s.events, newEvent].sort(
        (a, b) =>
          new Date(a.event_date ?? 0).getTime() -
          new Date(b.event_date ?? 0).getTime()
      ),
    }))
    return newEvent
  },

  deleteEvent: async (id) => {
    // Delete registrations first to avoid FK constraint violation (409)
    const { error: regErr } = await supabase.from('event_registrations').delete().eq('event_id', id)
    if (regErr) throw regErr
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
  },

  updateEvent: async (id, payload) => {
    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const updated = data as Event
    set((s) => ({
      events: s.events
        .map((e) => (e.id === id ? updated : e))
        .sort(
          (a, b) =>
            new Date(a.event_date ?? 0).getTime() -
            new Date(b.event_date ?? 0).getTime()
        ),
    }))
    return updated
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          set((s) => ({
            events: [...s.events, payload.new as Event].sort(
              (a, b) =>
                new Date(a.event_date ?? 0).getTime() -
                new Date(b.event_date ?? 0).getTime()
            ),
          }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'events' },
        (payload) => {
          const deletedId = (payload.old as Partial<Event>).id
          if (deletedId) set((s) => ({ events: s.events.filter((e) => e.id !== deletedId) }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          const updated = payload.new as Event
          set((s) => ({
            events: s.events.map((e) => (e.id === updated.id ? updated : e)),
          }))
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  },

  fetchRegistrations: async (userId) => {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('user_id', userId)
    if (error) return
    set({ registrations: (data ?? []) as FullRegistration[] })
  },

  register: async (eventId, userId) => {
    const cancelled = useEventsStore.getState().registrations.find(
      (r) => r.event_id === eventId && r.status === 'cancelled'
    )

    if (cancelled) {
      // Re-registration after cancellation — reset the existing record
      const { data, error } = await supabase
        .from('event_registrations')
        .update({ status: 'pending', qr_code_token: null })
        .eq('id', cancelled.id)
        .select()
        .single()
      if (error) throw error
      set((s) => ({
        registrations: s.registrations.map((r) =>
          r.id === cancelled.id ? (data as FullRegistration) : r
        ),
      }))
    } else {
      const { data, error } = await supabase
        .from('event_registrations')
        .insert({ event_id: eventId, user_id: userId })
        .select()
        .single()
      if (error) throw error
      set((s) => ({
        registrations: [...s.registrations, data as FullRegistration],
      }))
    }
  },

  cancelRegistration: async (regId) => {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'cancelled', qr_code_token: null })
      .eq('id', regId)
    if (error) throw error
    set((s) => ({
      registrations: s.registrations.map((r) =>
        r.id === regId
          ? { ...r, status: 'cancelled' as const, qr_code_token: null }
          : r
      ),
    }))
  },

  subscribeToRegistration: (registrationId, onApproved) => {
    const channel = supabase
      .channel(`reg-${registrationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_registrations',
          filter: `id=eq.${registrationId}`,
        },
        (payload) => {
          const updated = payload.new as FullRegistration
          if (updated.status === 'approved') {
            set((s) => ({
              registrations: s.registrations.map((r) =>
                r.id === registrationId ? { ...r, ...updated } : r
              ),
            }))
            onApproved(updated)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  },

  // Keep a synchronous getById helper for convenience
}))

// Selector helpers
export const getEventById = (id: string) =>
  useEventsStore.getState().events.find((e) => e.id === id)

export const getRegistrationByEventId = (eventId: string) =>
  useEventsStore.getState().registrations.find((r) => r.event_id === eventId)
