export const CHAPTER_NAMES = [
  'Manila',
  'Laguna',
  'Pampanga',
  'Bulacan',
  'Cebu',
  'Iloilo',
  'Bacolod',
  'Davao',
  'Cagayan de Oro',
  'General Santos',
  'Zamboanga',
] as const

export type ChapterName = (typeof CHAPTER_NAMES)[number]
