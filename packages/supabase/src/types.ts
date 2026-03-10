// ── DATABASE TYPES ──────────────────────────────────────────────────────────
// Typed to match the Supabase schema defined in CLAUDE.md §4.
// Generated types will replace this file once `supabase gen types typescript` is run.

export type Region = 'Luzon' | 'Visayas' | 'Mindanao'

export type UserRole = 'member' | 'chapter_officer' | 'hq_admin' | 'super_admin'

export type EventStatus = 'upcoming' | 'ongoing' | 'past'

export type RegistrationStatus = 'pending' | 'approved' | 'rejected'

export type PointSource =
  | 'signup'
  | 'event_attendance'
  | 'brown_bag'
  | 'speaking'
  | 'content_like'
  | 'content_share'
  | 'volunteering'
  | 'redemption'
  | 'bonus'

export type WorkType = 'remote' | 'onsite' | 'hybrid' | 'full_time' | 'part_time'

export type RewardType = 'digital' | 'physical'

export type ClaimMethod = 'onsite' | 'digital_delivery'

export type NewsCategory = 'devcon' | 'tech_community'

export type RedemptionStatus = 'pending' | 'claimed' | 'cancelled'

// ── TABLE INTERFACES ─────────────────────────────────────────────────────────

export interface Chapter {
  id: string
  name: string
  region: Region
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  username: string | null
  email: string
  school_or_company: string | null
  chapter_id: string | null
  role: UserRole
  avatar_url: string | null
  total_points: number
  pending_role: string | null
  pending_chapter_id: string | null
  created_at: string
}

export type UpgradeRequestStatus = 'pending' | 'approved' | 'rejected'

export interface OrganizerUpgradeRequest {
  id: string
  user_id: string
  organizer_code: string
  chapter_id: string | null
  requested_role: 'chapter_officer' | 'hq_admin'
  status: UpgradeRequestStatus
  reviewed_by: string | null
  created_at: string
  reviewed_at: string | null
}

export interface OrganizerCode {
  id: string
  code: string
  chapter_id: string
  assigned_role: 'chapter_officer' | 'hq_admin'
  is_active: boolean
  created_at: string
}

export interface Event {
  id: string
  chapter_id: string
  title: string
  description: string | null
  location: string | null
  event_date: string | null
  points_value: number
  requires_approval: boolean
  status: EventStatus
  is_featured: boolean
  is_promoted: boolean
  cover_image_url: string | null
  created_by: string
  created_at: string
}

export interface EventRegistration {
  id: string
  event_id: string
  user_id: string
  status: RegistrationStatus
  qr_code_token: string | null
  registered_at: string
  approved_at: string | null
}

export interface PointTransaction {
  id: string
  user_id: string
  amount: number
  description: string
  transaction_ref: string
  source: PointSource
  created_at: string
}

export interface Reward {
  id: string
  name: string
  description: string | null
  points_cost: number
  type: RewardType
  claim_method: ClaimMethod
  image_url: string | null
  is_active: boolean
  is_coming_soon: boolean
  created_at: string
}

export interface RewardRedemption {
  id: string
  user_id: string
  reward_id: string
  status: RedemptionStatus
  redeemed_at: string
  claimed_at: string | null
}

export interface Job {
  id: string
  title: string
  company: string
  location: string | null
  work_type: WorkType
  description: string | null
  apply_url: string | null
  is_promoted: boolean
  is_active: boolean
  posted_at: string
}

export interface NewsPost {
  id: string
  title: string
  body: string | null
  category: NewsCategory
  is_featured: boolean
  is_promoted: boolean
  cover_image_url: string | null
  author_id: string | null
  created_at: string
}
