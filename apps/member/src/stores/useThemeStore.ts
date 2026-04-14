import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeId = 'devcon' | 'she' | 'kids' | 'campus'

export interface ProgramTheme {
  id: ThemeId
  label: string
  hex: string
  darkHex: string
  cssClass: string
}

export const PROGRAM_THEMES: ProgramTheme[] = [
  { id: 'devcon', label: 'DEVCON+',       hex: '#1152D4', darkHex: '#0D42AA', cssClass: 'theme-devcon'  },
  { id: 'she',    label: 'She is DEVCON', hex: '#EC4899', darkHex: '#DB2777', cssClass: 'theme-she'     },
  { id: 'kids',   label: 'DEVCON Kids',   hex: '#21C45D', darkHex: '#16A34A', cssClass: 'theme-kids'    },
  { id: 'campus', label: 'Campus',        hex: '#F8C630', darkHex: '#EAB308', cssClass: 'theme-campus'  },
]

interface ThemeState {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
  activeTheme: () => ProgramTheme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: 'devcon',
      setTheme: (id) => set({ themeId: id }),
      activeTheme: () => PROGRAM_THEMES.find((t) => t.id === get().themeId)!,
    }),
    { name: 'devcon-theme' },
  ),
)
