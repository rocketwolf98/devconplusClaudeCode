const PH = 'en-PH'

export const formatDate = {
  /** "Feb 20, 2026" — cards, lists */
  short: (date: string | Date) =>
    new Date(date).toLocaleDateString(PH, { month: 'short', day: 'numeric', year: 'numeric' }),

  /** "February 20, 2026" — article / detail headers */
  long: (date: string | Date) =>
    new Date(date).toLocaleDateString(PH, { month: 'long', day: 'numeric', year: 'numeric' }),

  /** "Sunday, February 20, 2026" — event detail, ticket, points history */
  full: (date: string | Date) =>
    new Date(date).toLocaleDateString(PH, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),

  /** "Feb 20" — transaction previews (no year) */
  compact: (date: string | Date) =>
    new Date(date).toLocaleDateString(PH, { month: 'short', day: 'numeric' }),

  /** "FEB" — event date-block month header */
  monthShort: (date: string | Date) =>
    new Date(date).toLocaleDateString(PH, { month: 'short' }).toUpperCase(),

  /** "20" — event date-block day number */
  day: (date: string | Date) =>
    new Date(date).toLocaleDateString(PH, { day: 'numeric' }),
}
