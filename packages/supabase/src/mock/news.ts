import type { NewsPost } from '../types'

// NOTE: 2nd post in each category gets is_promoted:true → orange PROMOTED badge.
// Ordering: devcon posts first (2 items), then tech_community (2 items).
// On Dashboard, posts are filtered by active chip tab.
export const NEWS_POSTS: NewsPost[] = [
  {
    id: 'news-1',
    title: 'XP Rewards: New Items Added to the Store',
    body: 'Check out the latest rewards available for redemption including exclusive DEVCON merch — from caps and mugs to premium hoodies. Log in and head to the Rewards Store to see what\'s new.',
    category: 'devcon',
    is_featured: true,
    is_promoted: false,
    cover_image_url: null,
    author_id: null,
    created_at: '2026-02-20T09:00:00Z',
  },
  {
    id: 'news-2',
    title: 'She is DEVCON: Empowering Women in Tech',
    body: 'Our initiative to support and amplify women in the Philippine tech scene continues to grow. Join us for a series of events, mentorship sessions, and networking opportunities throughout 2026.',
    category: 'devcon',
    is_featured: false,
    is_promoted: true,
    cover_image_url: null,
    author_id: null,
    created_at: '2026-02-18T09:00:00Z',
  },
  {
    id: 'news-3',
    title: 'Philippine Tech Startups Raise $500M in Q1 2026',
    body: 'A record-breaking quarter for the Philippine startup ecosystem. Fintech, healthtech, and edtech sectors lead the charge as investors double down on Southeast Asian growth stories.',
    category: 'tech_community',
    is_featured: false,
    is_promoted: false,
    cover_image_url: null,
    author_id: null,
    created_at: '2026-02-15T09:00:00Z',
  },
  {
    id: 'news-4',
    title: 'Sui Foundation Partners with DEVCON Philippines',
    body: 'The Sui blockchain foundation announces a strategic partnership with DEVCON Philippines to upskill Filipino developers in Web3 technologies and open exclusive job opportunities for community members.',
    category: 'tech_community',
    is_featured: false,
    is_promoted: true,
    cover_image_url: null,
    author_id: null,
    created_at: '2026-02-10T09:00:00Z',
  },
]
