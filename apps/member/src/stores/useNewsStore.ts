import { create } from 'zustand'
import type { NewsPost } from '@devcon-plus/supabase'
import { supabase } from '../lib/supabase'

interface NewsState {
  posts: NewsPost[]
  isLoading: boolean
  error: string | null

  fetchNews: () => Promise<void>
}

export const useNewsStore = create<NewsState>((set) => ({
  posts: [],
  isLoading: false,
  error: null,

  fetchNews: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('news_posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ posts: (data ?? []) as NewsPost[], isLoading: false })
  },
}))
