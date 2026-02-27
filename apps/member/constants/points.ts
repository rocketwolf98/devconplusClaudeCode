import type { PointSource } from '@devcon-plus/supabase'

export const POINT_VALUES: Record<PointSource, string> = {
  signup: '500 XP',
  event_attendance: '100–300 XP',
  brown_bag: '250 XP',
  speaking: '700 XP',
  content_like: '1–5 XP',
  content_share: '10–25 XP',
  volunteering: '100–500 XP',
  redemption: 'varies',
  bonus: 'varies',
}

export const SIGNUP_BONUS = 500
export const XP_NEXT_MILESTONE = 250
