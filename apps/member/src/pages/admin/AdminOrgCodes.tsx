import { useEffect, useState } from 'react'
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'

interface OrgCode {
  id: string
  code: string
  chapter_id: string
  assigned_role: string
  is_active: boolean
  created_at: string
  chapters?: { name: string } | null
}

interface Chapter {
  id: string
  name: string
}

const schema = z.object({
  code:          z.string().min(3, 'Code too short').toUpperCase(),
  chapter_id:    z.string().min(1, 'Select a chapter'),
  assigned_role: z.enum(['chapter_officer', 'hq_admin']),
})
type FormData = z.infer<typeof schema>

export default function AdminOrgCodes() {
  const [codes, setCodes] = useState<OrgCode[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { assigned_role: 'chapter_officer' },
  })

  const load = async () => {
    setIsLoading(true)
    const [codesRes, chaptersRes] = await Promise.all([
      supabase
        .from('organizer_codes')
        .select('*, chapters(name)')
        .order('created_at', { ascending: false }),
      supabase.from('chapters').select('id, name').order('name'),
    ])
    setCodes((codesRes.data ?? []) as OrgCode[])
    setChapters((chaptersRes.data ?? []) as Chapter[])
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

  const onSubmit = async (data: FormData) => {
    setError(null)
    const { data: inserted, error: dbErr } = await supabase
      .from('organizer_codes')
      .insert({
        code: data.code.toUpperCase(),
        chapter_id: data.chapter_id,
        assigned_role: data.assigned_role,
        is_active: true,
      })
      .select('*, chapters(name)')
      .single()
    if (dbErr) { setError(dbErr.message); return }
    setCodes((prev) => [inserted as OrgCode, ...prev])
    reset()
    setShowForm(false)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Organizer Codes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Issue codes to grant officer access per chapter</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Code</label>
              <input
                {...register('code')}
                placeholder="ORG-MANILA"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue uppercase"
              />
              {errors.code && <p className="text-red text-[10px] mt-1">{errors.code.message}</p>}
            </div>
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
              onClick={() => { setShowForm(false); reset() }}
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
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Chapter</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs tracking-wider">{c.code}</td>
                  <td className="px-4 py-3 text-slate-600">{c.chapters?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{c.assigned_role}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.is_active ? 'bg-green/10 text-green' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
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
