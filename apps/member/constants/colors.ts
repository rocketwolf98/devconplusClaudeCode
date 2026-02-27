// Design tokens extracted from index.html prototype — source of truth
export const Colors = {
  blue: '#3B5BDE',
  blueDark: '#2F48C0',
  blueLight: '#5B7BF8',
  blue10: 'rgba(59,91,222,0.10)',
  blue20: 'rgba(59,91,222,0.20)',
  gold: '#F8C630',
  gold20: 'rgba(248,198,48,0.20)',
  green: '#21C45D',
  green10: 'rgba(33,196,93,0.10)',
  red: '#EF4444',
  red10: 'rgba(239,68,68,0.10)',
  navy: '#1E2A56',
  white: '#FFFFFF',
  bg: '#FFFFFF',
  bg2: '#F8FAFC',
  promoted: '#F97316', // orange — PROMOTED badge only (CLAUDE.md mandate)
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate700: '#334155',
  slate900: '#0F172A',
} as const

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
} as const
