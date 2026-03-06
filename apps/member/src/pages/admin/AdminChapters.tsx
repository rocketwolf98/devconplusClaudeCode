import { useEffect, useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Region = 'Luzon' | 'Visayas' | 'Mindanao'
const REGIONS: Region[] = ['Luzon', 'Visayas', 'Mindanao']

interface Chapter {
  id: string
  name: string
  region: Region | null
  created_at: string
}

export default function AdminChapters() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRegion, setEditRegion] = useState<Region>('Luzon')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const { data, error: dbErr } = await supabase
        .from('chapters')
        .select('*')
        .order('name')
      if (dbErr) { setError(dbErr.message); setIsLoading(false); return }
      setChapters((data ?? []) as Chapter[])
      setIsLoading(false)
    }
    void load()
  }, [])

  const startEdit = (chapter: Chapter) => {
    setEditingId(chapter.id)
    setEditName(chapter.name)
    setEditRegion((chapter.region as Region) ?? 'Luzon')
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    setError(null)
    const { error: dbErr } = await supabase
      .from('chapters')
      .update({ name: editName, region: editRegion })
      .eq('id', id)
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    setChapters((prev) =>
      prev.map((c) => c.id === id ? { ...c, name: editName, region: editRegion } : c)
    )
    setEditingId(null)
  }

  const regionColor: Record<Region, string> = {
    Luzon:    'bg-blue/10 text-blue',
    Visayas:  'bg-gold/10 text-gold',
    Mindanao: 'bg-green/10 text-green',
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-black text-slate-900 mb-1">Chapters</h1>
      <p className="text-sm text-slate-500 mb-6">Manage the 11 DEVCON chapters</p>

      {error && (
        <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading chapters…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Chapter</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Region</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {chapters.map((chapter) => (
                <tr key={chapter.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    {editingId === chapter.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue w-44"
                        autoFocus
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{chapter.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === chapter.id ? (
                      <select
                        value={editRegion}
                        onChange={(e) => setEditRegion(e.target.value as Region)}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue"
                      >
                        {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        chapter.region ? regionColor[chapter.region as Region] : 'bg-slate-100 text-slate-400'
                      }`}>
                        {chapter.region ?? '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === chapter.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => void saveEdit(chapter.id)}
                          disabled={saving || !editName.trim()}
                          className="p-1.5 rounded-lg bg-green/10 text-green hover:bg-green/20 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(chapter)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-blue/10 hover:text-blue transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {chapters.length === 0 && (
            <p className="text-center py-10 text-slate-400 text-sm">No chapters found.</p>
          )}
        </div>
      )}
    </div>
  )
}
