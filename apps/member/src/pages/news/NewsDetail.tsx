import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Tag, Newspaper } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNewsStore } from '../../stores/useNewsStore'
import PromotedBadge from '../../components/PromotedBadge'
import { fadeUp } from '../../lib/animation'
import { CATEGORY_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/dates'

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { posts, fetchNews } = useNewsStore()

  useEffect(() => {
    if (posts.length === 0) void fetchNews()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const post = posts.find((p) => p.id === id)

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <Newspaper className="w-12 h-12 text-slate-300 mb-4" />
        <p className="font-semibold text-slate-700">Article not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-primary text-sm font-semibold"
        >
          Go back
        </button>
      </div>
    )
  }

  const dateStr = post.created_at ? formatDate.long(post.created_at) : ''

  return (
    <div className="bg-slate-50 min-h-full pb-10">
      {/* Hero image with sticky back button */}
      <div className="relative">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-56 object-cover"
          />
        ) : (
          <div className="w-full h-56 bg-primary flex items-center justify-center">
            <Newspaper className="w-14 h-14 text-white/20" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {post.is_promoted && (
          <div className="absolute top-12 right-4">
            <PromotedBadge />
          </div>
        )}
      </div>

      {/* Article content */}
      <motion.div
        className="px-5 pt-5 space-y-4"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        {/* Meta row */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            <Tag className="w-3 h-3" />
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          {dateStr && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Calendar className="w-3 h-3" />
              {dateStr}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-black text-slate-900 leading-snug">{post.title}</h1>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Article body */}
        {post.body && (
          <p className="text-sm text-slate-700 leading-relaxed">{post.body}</p>
        )}

        {/* Footer tag */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-[11px] text-slate-400 text-center">
            Published by DEVCON Philippines · {dateStr}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
