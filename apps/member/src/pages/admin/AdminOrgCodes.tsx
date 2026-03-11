import { useEffect, useState } from 'react'
import { Plus, ToggleLeft, ToggleRight, RefreshCw, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'

const generateCode = (): string => {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('')
  const numbers = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 10)
  ).join('')
  return `DCN-${letters}-${numbers}`
}

interface OrgCode {
  id: string
  code: string
  chapter_id: string | null
  program_id: string | null
  scope_type: 'chapter' | 'program'
  assigned_role: string
  is_active: boolean
  usage_limit: number | null
  usage_count: number
  expires_at: string | null
  created_at: string
  chapters?: { name: string } | null
  programs?: { name: string } | null
}

interface Chapter {
  id: string
  name: string
}

interface Program {
  id: string
  name: string
}

const CODE_PATTERN = /^DCN-[A-Z]{3}-[0-9]{4}$/

const schema = z
  .object({
    code: z.string().regex(CODE_PATTERN, 'Must match DCN-XXX-XXXX format'),
    scope_type: z.enum(['chapter', 'program']).default('chapter'),
    chapter_id: z.string().optional(),
    program_id: z.string().optional(),
    assigned_role: z.enum(['chapter_officer', 'hq_admin']),
    usage_limit: z.coerce.number().int().positive().optional(),
    has_usage_limit: z.boolean().default(false),
    expires_at: z.string().optional(),
    has_expiry: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.scope_type === 'chapter' && !data.chapter_id) {
      ctx.addIssue({ code: 'custom', path: ['chapter_id'], message: 'Select a chapter' })
    }
    if (data.scope_type === 'program' && !data.program_id) {
      ctx.addIssue({ code: 'custom', path: ['program_id'], message: 'Select a program' })
    }
  })

type FormData = z.infer<typeof schema>

export default function AdminOrgCodes() {
  const [codes, setCodes] = useState<OrgCode[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assigned_role: 'chapter_officer',
      code: generateCode(),
      scope_type: 'chapter',
      has_usage_limit: false,
      has_expiry: false,
    },
  })

  const scopeType = watch('scope_type')
  const hasUsageLimit = watch('has_usage_limit')
  const hasExpiry = watch('has_expiry')

  const load = async () => {
    setIsLoading(true)
    const [codesRes, chaptersRes, programsRes] = await Promise.all([
      supabase
        .from('organizer_codes')
        .select('*, chapters(name), programs(name)')
        .order('created_at', { ascending: false }),
      supabase.from('chapters').select('id, name').order('name'),
      supabase.from('programs').select('id, name').order('name'),
    ])
    setCodes((codesRes.data ?? []) as OrgCode[])
    setChapters((chaptersRes.data ?? []) as Chapter[])
    setPrograms((programsRes.data ?? []) as Program[])
    setIsLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleToggle = async (id: string, current: boolean) => {
    const { error: dbErr } = await supabase
      .from('organizer_codes')
      .update({ is_active: !current })
      .eq('id', id)
    if (dbErr) { setError(dbErr.message); return }
    setCodes((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c))
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const { error: dbErr } = await supabase
      .from('organizer_codes')
      .delete()
      .eq('id', id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (dbErr) { setError(dbErr.message); return }
    setCodes((prev) => prev.filter((c) => c.id !== id))
  }

  const onSubmit = async (data: FormData) => {
    setError(null)
    const { data: inserted, error: dbErr } = await supabase
      .from('organizer_codes')
      .insert({
        code: data.code.toUpperCase(),
        scope_type: data.scope_type,
        chapter_id: data.scope_type === 'chapter' ? (data.chapter_id ?? null) : null,
        program_id: data.scope_type === 'program' ? (data.program_id ?? null) : null,
        assigned_role: data.assigned_role,
        is_active: true,
        usage_limit: data.has_usage_limit ? (data.usage_limit ?? null) : null,
        usage_count: 0,
        expires_at: data.has_expiry ? (data.expires_at ?? null) : null,
      })
      .select('*, chapters(name), programs(name)')
      .single()
    if (dbErr) { setError(dbErr.message); return }
    setCodes((prev) => [inserted as OrgCode, ...prev])
    reset({
      assigned_role: 'chapter_officer',
      code: generateCode(),
      scope_type: 'chapter',
      has_usage_limit: false,
      has_expiry: false,
    })
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Organizer Codes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Issue codes to grant officer access per chapter or program</p>
        </div>
        <button
          onClick={() => { setValue('code', generateCode()); setShowForm((v) => !v) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Code
        </button>
      </div>

      {error && (
        <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-card space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900">Create Organizer Code</h2>

          {/* Row 1: Code */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Code</label>
            <div className="flex gap-1.5">
              <input
                {...register('code')}
                readOnly
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue"
              />
              <button
                type="button"
                onClick={() => setValue('code', generateCode())}
                className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-blue/10 hover:text-blue hover:border-blue/30 transition-colors"
                title="Regenerate"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {errors.code && <p className="text-red text-[10px] mt-1">{errors.code.message}</p>}
          </div>

          {/* Row 2: Scope segmented control */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Scope</label>
            <Controller
              control={control}
              name="scope_type"
              render={({ field }) => (
                <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                  {(['chapter', 'program'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => field.onChange(s)}
                      className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${
                        field.value === s
                          ? 'bg-blue text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Row 3: Conditional chapter or program dropdown */}
          {scopeType === 'chapter' ? (
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Chapter</label>
              <select
                {...register('chapter_id')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue"
              >
                <option value="">Select…</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.chapter_id && <p className="text-red text-[10px] mt-1">{errors.chapter_id.message}</p>}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Program</label>
              <select
                {...register('program_id')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue"
              >
                <option value="">Select…</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.program_id && <p className="text-red text-[10px] mt-1">{errors.program_id.message}</p>}
            </div>
          )}

          {/* Row 4: Role */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Role</label>
            <select
              {...register('assigned_role')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue"
            >
              <option value="chapter_officer">Chapter Officer</option>
              <option value="hq_admin">HQ Admin</option>
            </select>
          </div>

          {/* Row 5: Usage Limit */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('has_usage_limit')}
                id="has_usage_limit"
                className="w-4 h-4 accent-blue"
              />
              <label htmlFor="has_usage_limit" className="text-xs text-slate-700">Limit uses</label>
            </div>
            {hasUsageLimit && (
              <input
                {...register('usage_limit')}
                type="number"
                min={1}
                placeholder="Max uses"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue"
              />
            )}
            {errors.usage_limit && <p className="text-red text-[10px] mt-1">{errors.usage_limit.message}</p>}
          </div>

          {/* Row 6: Expiry */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('has_expiry')}
                id="has_expiry"
                className="w-4 h-4 accent-blue"
              />
              <label htmlFor="has_expiry" className="text-xs text-slate-700">Set expiry date</label>
            </div>
            {hasExpiry && (
              <input
                {...register('expires_at')}
                type="date"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue"
              />
            )}
            {errors.expires_at && <p className="text-red text-[10px] mt-1">{errors.expires_at.message}</p>}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue text-white text-sm font-bold rounded-xl hover:bg-blue-dark disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Creating…' : 'Create Code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                reset({
                  assigned_role: 'chapter_officer',
                  code: generateCode(),
                  scope_type: 'chapter',
                  has_usage_limit: false,
                  has_expiry: false,
                })
              }}
              className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading codes…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Scope</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Usage</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs tracking-wider">{c.code}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{c.assigned_role}</td>
                  <td className="px-4 py-3 text-slate-600">{c.chapters?.name ?? c.programs?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs tabular-nums">
                    {c.usage_count} / {c.usage_limit ?? '∞'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {c.expires_at
                      ? new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.is_active ? 'bg-green/10 text-green' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => void handleToggle(c.id, c.is_active)}
                        className="text-slate-400 hover:text-blue transition-colors"
                        title={c.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {c.is_active
                          ? <ToggleRight className="w-5 h-5 text-green" />
                          : <ToggleLeft className="w-5 h-5" />
                        }
                      </button>
                      {confirmDeleteId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          >Cancel</button>
                          <button
                            onClick={() => void handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            className="text-xs px-2 py-1 rounded-lg bg-red text-white disabled:opacity-50 hover:bg-red/80 transition-colors"
                          >{deletingId === c.id ? '…' : 'Delete'}</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="p-1 rounded-lg text-slate-400 hover:bg-red/10 hover:text-red transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {codes.length === 0 && (
            <p className="text-center py-10 text-slate-400 text-sm">No organizer codes yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
