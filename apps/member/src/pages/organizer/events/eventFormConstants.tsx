import { z } from 'zod'
import type { DevconCategory } from '@devcon-plus/supabase'

// ── Zod schema ────────────────────────────────────────────────────────────────

export const schema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be under 100 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be under 5000 characters'),
    location: z.string().min(2, 'Location is required').max(200, 'Location must be under 200 characters'),
    event_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().optional(),
    category: z.enum([
      'tech_talk',
      'hackathon',
      'workshop',
      'brown_bag',
      'summit',
      'social',
      'networking',
    ], { required_error: 'Category is required' }),
    devcon_category: z.enum(['devcon', 'she', 'kids', 'campus']).optional().nullable(),
    tags: z.array(z.string().max(30)).max(10).default([]),
    visibility: z.enum(['public', 'unlisted', 'draft']).default('public'),
    is_free: z.boolean().default(true),
    ticket_price_php: z.number({ coerce: true }).int().min(0).max(100000, 'Price cannot exceed ₱100,000').default(0),
    capacity: z.preprocess(
      (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
      z.number().int().positive().max(100000, 'Capacity cannot exceed 100,000').optional()
    ),
    points_value: z
      .number({ coerce: true })
      .min(50, 'Minimum 50 XP')
      .max(1000, 'Maximum 1000 XP'),
    requires_approval: z.boolean(),
    cover_image_url: z.string().url().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.end_date && data.event_date && data.end_date <= data.event_date) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_date'],
        message: 'End time must be after start time',
      })
    }
  })

export type FormData = z.infer<typeof schema>

// ── Styles ────────────────────────────────────────────────────────────────────

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20'

export const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5'

// ── Options ───────────────────────────────────────────────────────────────────

export const CATEGORY_OPTIONS: { value: FormData['category']; label: string }[] = [
  { value: 'tech_talk',  label: 'Tech Talk'  },
  { value: 'hackathon',  label: 'Hackathon'  },
  { value: 'workshop',   label: 'Workshop'   },
  { value: 'brown_bag',  label: 'Brown Bag'  },
  { value: 'summit',     label: 'Summit'     },
  { value: 'social',     label: 'Social'     },
  { value: 'networking', label: 'Networking' },
]

export const DEVCON_PROGRAM_OPTIONS: {
  value: DevconCategory
  label: string
  hex: string
  darkText?: boolean
}[] = [
  { value: 'devcon', label: 'DEVCON',        hex: '#367BDD' },
  { value: 'she',    label: '#SheIsDEVCON',  hex: '#EC4899' },
  { value: 'kids',   label: 'DEVCON Kids',   hex: '#21C45D' },
  { value: 'campus', label: 'Campus DEVCON', hex: '#F8C630', darkText: true },
]

export const VISIBILITY_OPTIONS: { value: FormData['visibility']; label: string }[] = [
  { value: 'public',   label: 'Public'   },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'draft',    label: 'Draft'    },
]

// ── SectionHeader ─────────────────────────────────────────────────────────────

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">{title}</p>
    </div>
  )
}
