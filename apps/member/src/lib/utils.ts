import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function fuzzySearchFilter<T extends Record<string, unknown>>(
  query: string | null | undefined,
  item: T,
  keys: (keyof T)[]
): boolean {
  if (!query) return true
  const trimmed = query.trim()
  if (!trimmed) return true
  if (trimmed.length > 200) return false

  // Builds a subsequence regex: each char separated by .* so "rct" matches "React"
  const pattern = trimmed
    .split('')
    .map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')

  try {
    const regex = new RegExp(pattern, 'i')
    return keys.some((key) => {
      const value = item[key]
      if (value === null || value === undefined) return false
      return regex.test(String(value))
    })
  } catch {
    return true
  }
}
