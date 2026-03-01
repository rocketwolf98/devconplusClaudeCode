import { Newspaper } from 'lucide-react'
import type { NewsPost } from '@devcon-plus/supabase'
import PromotedBadge from './PromotedBadge'

export default function NewsCard({ post }: { post: NewsPost }) {
  const dateStr = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden relative">
      {post.is_promoted && (
        <div className="absolute top-3 right-3 z-10">
          <PromotedBadge />
        </div>
      )}
      {post.cover_image_url ? (
        <img src={post.cover_image_url} alt={post.title} className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-blue to-navy flex items-center justify-center">
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
