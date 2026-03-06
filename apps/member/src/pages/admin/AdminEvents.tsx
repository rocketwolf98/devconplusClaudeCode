import { useEffect, useState } from 'react'
import { MapPin, Trash2, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Event } from '@devcon-plus/supabase'

interface EventWithChapter extends Event {
  chapters?: { name: string } | null
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventWithChapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const { data, error: dbErr } = await supabase
        .from('events')
        .select('*, chapters(name)')
        .order('event_date', { ascending: false })
      if (dbErr) { setError(dbErr.message); setIsLoading(false); return }
      setEvents((data ?? []) as EventWithChapter[])
      setIsLoading(false)
    }
    void load()
  }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)
    const { error: dbErr } = await supabase.from('events').delete().eq('id', id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (dbErr) { setError(dbErr.message); return }
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">Events</h1>
      <p className="text-sm text-slate-500 mb-6">View and remove events across all chapters</p>

      {error && (
        <p className="text-red text-xs bg-red/5 border border-red/20 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading events…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Chapter</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">XP</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{event.title}</p>
                    {event.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {event.location}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{event.chapters?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'TBA'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue/80 bg-blue/10 px-2 py-0.5 rounded-full">
                      <Zap className="w-3 h-3" />
                      {event.points_value}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      event.status === 'upcoming' ? 'bg-blue/10 text-blue'
                      : event.status === 'ongoing' ? 'bg-green/10 text-green'
                      : 'bg-slate-100 text-slate-500'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDeleteId === event.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-slate-500">Sure?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void handleDelete(event.id)}
                          disabled={deletingId === event.id}
                          className="text-xs px-2 py-1 rounded-lg bg-red text-white disabled:opacity-50"
                        >
                          {deletingId === event.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(event.id)}
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
          {events.length === 0 && (
            <p className="text-center py-10 text-slate-400 text-sm">No events found.</p>
          )}
        </div>
      )}
    </div>
  )
}
