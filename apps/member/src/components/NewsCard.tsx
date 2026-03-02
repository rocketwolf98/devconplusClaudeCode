import { Newspaper } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { NewsPost } from '@devcon-plus/supabase'
import PromotedBadge from './PromotedBadge'
import { formatDate } from '../lib/dates'

export default function NewsCard({ post }: { post: NewsPost }) {
  const navigate = useNavigate()
  const dateStr = post.created_at ? formatDate.short(post.created_at) : ''

  return (
    <div
      className="bg-white rounded-2xl shadow-card overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate(`/news/${post.id}`)}
    >
      {post.is_promoted && (
        <div className="absolute top-3 right-3 z-10">
          <PromotedBadge />
        </div>
      )}
      {post.cover_image_url ? (
        <img src={post.cover_image_url} alt={post.title} className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-32 bg-primary flex items-center justify-center">
          <Newspaper className="w-10 h-10 text-white/20" />
        </div>
      )}
      <div className="p-3">
        <p className="text-xs text-slate-400 mb-1">{dateStr}</p>
        <p className="font-semibold text-slate-900 text-sm leading-tight">{post.title}</p>
      </div>
    </div>
  )
}
