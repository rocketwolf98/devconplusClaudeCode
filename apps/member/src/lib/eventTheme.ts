import type React from 'react'
import { PROGRAM_THEMES } from '../stores/useThemeStore'
import type { ProgramTheme } from '../stores/useThemeStore'
import type { DevconCategory } from '@devcon-plus/supabase'

// CSS custom property overrides — for components that use Tailwind text-primary/bg-primary
const CATEGORY_CSS_VARS: Record<DevconCategory, React.CSSProperties> = {
  devcon: { '--color-primary': '17 82 212',  '--color-primary-dark': '13 66 170'  } as React.CSSProperties,
  she:    { '--color-primary': '236 72 153',  '--color-primary-dark': '219 39 119' } as React.CSSProperties,
  kids:   { '--color-primary': '33 196 93',   '--color-primary-dark': '22 163 74'  } as React.CSSProperties,
  campus: { '--color-primary': '248 198 48',  '--color-primary-dark': '234 179 8'  } as React.CSSProperties,
}

/**
 * Returns inline CSS custom property overrides for a given program category.
 * Apply to a page's root element to theme all `text-primary` / `bg-primary`
 * descendants without mutating global state.
 * Returns {} when no category is set (no override — falls through to global theme).
 */
export function getEventThemeStyle(
  devcon_category: DevconCategory | null | undefined
): React.CSSProperties {
  if (!devcon_category) return {}
  return CATEGORY_CSS_VARS[devcon_category] ?? {}
}

/**
 * Resolves the effective ProgramTheme for an event.
 * Used by components that need hex/darkHex values directly (e.g. inline gradients).
 * Falls back to the user's current global theme when no program is set.
 */
export function resolveEventTheme(
  devcon_category: DevconCategory | null | undefined,
  fallbackTheme: ProgramTheme
): ProgramTheme {
  if (!devcon_category) return fallbackTheme
  return PROGRAM_THEMES.find((t) => t.id === devcon_category) ?? fallbackTheme
}
