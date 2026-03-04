// Manual Database type wrapper for SupabaseClient<Database> generic.
// Replace this entire file with the output of `supabase gen types typescript` once CLI is linked.

import type {
  Profile,
  Event,
  EventRegistration,
  PointTransaction,
  Job,
  Reward,
  RewardRedemption,
  NewsPost,
  Chapter,
  OrganizerCode,
} from './types'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Event, 'id' | 'created_at'>>
      }
      event_registrations: {
        Row: EventRegistration & { checked_in: boolean }
        Insert: Pick<EventRegistration, 'event_id' | 'user_id'> & { checked_in?: boolean }
        Update: Partial<Omit<EventRegistration, 'id' | 'event_id' | 'user_id' | 'registered_at'>> & { checked_in?: boolean }
      }
      point_transactions: {
        Row: PointTransaction
        Insert: Omit<PointTransaction, 'id' | 'transaction_ref' | 'created_at'> & { id?: string; transaction_ref?: string; created_at?: string }
        Update: Partial<Omit<PointTransaction, 'id' | 'created_at'>>
      }
      jobs: {
        Row: Job
        Insert: Omit<Job, 'id' | 'posted_at'> & { id?: string; posted_at?: string }
        Update: Partial<Omit<Job, 'id' | 'posted_at'>>
      }
      rewards: {
        Row: Reward
        Insert: Omit<Reward, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Reward, 'id' | 'created_at'>>
      }
      reward_redemptions: {
        Row: RewardRedemption
        Insert: Pick<RewardRedemption, 'user_id' | 'reward_id'>
        Update: Partial<Pick<RewardRedemption, 'status' | 'claimed_at'>>
      }
      news_posts: {
        Row: NewsPost
        Insert: Omit<NewsPost, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<NewsPost, 'id' | 'created_at'>>
      }
      chapters: {
        Row: Chapter
        Insert: Omit<Chapter, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Chapter, 'id' | 'created_at'>>
      }
      organizer_codes: {
        Row: OrganizerCode
        Insert: Omit<OrganizerCode, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<OrganizerCode, 'id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
