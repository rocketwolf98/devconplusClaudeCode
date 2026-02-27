import type { Profile } from '../types'

export const MOCK_PROFILE: Profile = {
  id: 'user-marie-santos',
  full_name: 'Marie Santos',
  email: 'marie.santos@email.com',
  school_or_company: 'University of the Philippines',
  chapter_id: 'ch-manila',
  role: 'member',
  avatar_url: null,
  total_points: 100,
  created_at: '2026-01-01T00:00:00Z',
}

// Derived display helpers
export const MOCK_PROFILE_INITIALS = 'MS'
export const MOCK_PROFILE_XP_NEXT_MILESTONE = 250 // next reward at 250 XP
export const MOCK_PROFILE_XP_PROGRESS = MOCK_PROFILE.total_points / MOCK_PROFILE_XP_NEXT_MILESTONE
