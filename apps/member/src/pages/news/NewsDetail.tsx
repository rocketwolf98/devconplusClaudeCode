import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Tag, Newspaper } from 'lucide-react'
import { motion } from 'framer-motion'
import { NEWS_POSTS } from '@devcon-plus/supabase'
import PromotedBadge from '../../components/PromotedBadge'
import { fadeUp } from '../../lib/animation'
import { CATEGORY_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/dates'

const MOCK_BODY_PARAGRAPHS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.',
  'Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. Donec non enim in turpis pulvinar facilisis. Ut felis.',
  'Cras mattis consectetur purus sit amet fermentum. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Nullam quis risus eget urna mollis ornare vel eu leo.',
]


export default function NewsDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const post = NEWS_POSTS.find((p) => p.id === id)

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

        {/* Lead paragraph (real body from mock data) */}
        {post.body && (
          <p className="text-sm text-slate-700 leading-relaxed font-medium">{post.body}</p>
        )}

        {/* Full article body (mock lorem ipsum) */}
        {MOCK_BODY_PARAGRAPHS.map((para, i) => (
          <p key={i} className="text-sm text-slate-600 leading-relaxed">
            {para}
          </p>
        ))}

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
