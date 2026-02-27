import type { UserRole } from '@devcon-plus/supabase'

export const ROLE_LABELS: Record<UserRole, string> = {
  member: 'Member',
  chapter_officer: 'Chapter Officer',
  hq_admin: 'HQ Admin',
  super_admin: 'Super Admin',
}

export const ORGANIZER_ROLES: UserRole[] = ['chapter_officer', 'hq_admin', 'super_admin']

export function isOrganizer(role: UserRole): boolean {
  return ORGANIZER_ROLES.includes(role)
}
