import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '@devcon-plus/supabase'

type UserRole = 'member' | 'chapter_officer' | 'hq_admin' | 'super_admin'
const ROLES: UserRole[] = ['member', 'chapter_officer', 'hq_admin', 'super_admin']

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    const { data, error: dbErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (dbErr) { setError(dbErr.message); setIsLoading(false); return }
    setUsers((data ?? []) as Profile[])
    setIsLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (dbErr) { setError(dbErr.message); return }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
  }

  const handleDelete = async (userId: string) => {
    setDeletingId(userId)
    setError(null)
    const { error: dbErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (dbErr) { setError(dbErr.message); return }
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-black text-slate-900 mb-1">Users</h1>
      <p className="text-sm text-slate-500 mb-6">Manage member roles and accounts</p>

      {error && (
        <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading users…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Points</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => void handleRoleChange(u.id, e.target.value as UserRole)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">{(u.total_points ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {confirmDeleteId === u.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-slate-500">Sure?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void handleDelete(u.id)}
                          disabled={deletingId === u.id}
                          className="text-xs px-2 py-1 rounded-lg bg-red text-white disabled:opacity-50 hover:bg-red/80 transition-colors"
                        >
                          {deletingId === u.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(u.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red/10 hover:text-red transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center py-10 text-slate-400 text-sm">No users found.</p>
          )}
        </div>
      )}
    </div>
  )
}
