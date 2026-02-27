import { useState } from 'react'
import { useEventsStore } from '../../stores/useEventsStore'
import EventCard from '../../components/EventCard'
import ChipBar from '../../components/ChipBar'

const CHAPTERS = ['All', 'Manila', 'Cebu', 'Davao', 'Laguna', 'Iloilo', 'Pampanga', 'Bulacan', 'Bacolod', 'CDO', 'GenSan', 'Zamboanga']

export default function EventsList() {
  const { events } = useEventsStore()
  const [tab, setTab] = useState<'for-you' | 'all'>('for-you')
  const [chapter, setChapter] = useState('All')

  const filtered = events.filter((e) => {
    if (tab === 'for-you') return e.status === 'upcoming'
    return true
  })

  return (
    <div>
      {/* Header + tab toggle */}
      <div className="bg-navy px-4 pt-14 pb-4">
        <h1 className="text-white text-xl font-bold">Events</h1>
        <div className="flex gap-2 mt-3">
          {(['for-you', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? 'bg-blue text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {t === 'for-you' ? 'For You' : 'All Events'}
            </button>
          ))}
        </div>
      </div>

      {/* Chapter filter */}
      <div className="bg-navy pb-3">
        <ChipBar options={CHAPTERS} selected={chapter} onChange={setChapter} />
      </div>

      {/* List */}
      <div className="bg-slate-50 min-h-screen p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No events found</div>
        ) : (
          filtered.map((e) => <EventCard key={e.id} event={e} />)
        )}
      </div>
    </div>
  )
}
