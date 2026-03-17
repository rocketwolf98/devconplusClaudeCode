import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Tag, Newspaper } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNewsStore } from '../../stores/useNewsStore'
import PromotedBadge from '../../components/PromotedBadge'
import { fadeUp } from '../../lib/animation'
import { CATEGORY_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/dates'
import NotFound from '../NotFound'

const WELCOME_POST = {
  id: 'welcome',
  title: 'Welcome to DEVCON+ — Your Tech Community Hub',
  body: `DEVCON+ is the unified platform for DEVCON Philippines — the country's largest volunteer tech community with 11 nationwide chapters, 60,000+ members, and 14,000+ annual attendees.

## What you can do with DEVCON+

### Register for Events
Browse and register for 100+ annual chapter events across all 11 chapters. Get your QR ticket instantly or track your pending approval from chapter officers.

### Earn Points+
Every activity earns you points. Attend events, volunteer at chapters, share content, and more. Watch your score grow and unlock reward tiers.

### Redeem Rewards
Spend your Points+ on exclusive DEVCON merchandise, vouchers, and more. The Rewards catalog is launching soon — keep earning in the meantime.

### Jobs Board
Access global tech career opportunities curated for Filipino developers. Coming soon with the full MVP.

---

We're excited to have you in the community. Keep attending events, keep earning, and keep leveling up!

— The DEVCON+ Team`,
  category: 'devcon' as const,
  is_featured: true,
  is_promoted: false,
  cover_image_url: '/photos/devcon-summit-group.jpg',
  author_id: null,
  created_at: '2026-03-01T09:00:00Z',
}

/** Renders a body string with basic markdown-like formatting:
 *  ## Heading 2, ### Heading 3, --- divider, plain paragraphs.
 *  Splits on double newlines for paragraph breaks. */
function ArticleBody({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/)

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const trimmed = block.trim()

        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="text-base font-bold text-slate-900 pt-2">
              {trimmed.slice(3)}
            </h2>
          )
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-sm font-bold text-primary">
              {trimmed.slice(4)}
            </h3>
          )
        }

        if (trimmed === '---') {
          return <hr key={i} className="border-slate-200" />
        }

        // Lines starting with "-" → bullet list
        if (trimmed.startsWith('- ')) {
          const items = trimmed.split('\n').filter((l) => l.startsWith('- '))
          return (
            <ul key={i} className="space-y-1 pl-4">
              {items.map((item, j) => (
                <li key={j} className="text-sm text-slate-700 leading-relaxed list-disc">
                  {item.slice(2)}
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={i} className="text-sm text-slate-700 leading-relaxed">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { posts, fetchNews, isLoading } = useNewsStore()

  useEffect(() => {
    if (id !== 'welcome' && posts.length === 0) void fetchNews()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const post = id === 'welcome' ? WELCOME_POST : posts.find((p) => p.id === id)

  if (!post && isLoading) return null
  if (!post) return <NotFound />

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
        {post.body && <ArticleBody body={post.body} />}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-[11px] text-slate-400 text-center">
            Published by DEVCON Philippines · {dateStr}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
