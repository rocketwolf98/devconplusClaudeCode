import { create } from 'zustand'
import type { Event, EventRegistration } from '@devcon-plus/supabase'
import { EVENTS } from '@devcon-plus/supabase'

interface EventsState {
  events: Event[]
  registrations: EventRegistration[]
  register: (eventId: string) => void
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: EVENTS,
  registrations: [],

  register: (eventId: string) => {
    const event = get().events.find((e) => e.id === eventId)
    if (!event) return
    const reg: EventRegistration = {
      id: `reg-${Date.now()}`,
      event_id: eventId,
      user_id: 'user-marie-santos',
      status: event.requires_approval ? 'pending' : 'approved',
      qr_code_token: event.requires_approval ? null : `DCN-${Date.now()}`,
      registered_at: new Date().toISOString(),
      approved_at: event.requires_approval ? null : new Date().toISOString(),
    }
    set((s) => ({ registrations: [...s.registrations, reg] }))
  },
}))
