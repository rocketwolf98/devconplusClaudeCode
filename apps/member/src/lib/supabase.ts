import { createClient } from '@supabase/supabase-js'
import type { Database } from '@devcon-plus/supabase'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use navigator.locks to serialize concurrent token-refresh calls and
      // prevent multiple tabs from consuming the same refresh token.
      // We honour the acquireTimeout passed by GoTrue (default 10 s) via an
      // AbortController signal. On timeout we fall back to calling fn()
      // directly — this trades a theoretical multi-tab refresh-token race for
      // the guarantee that a stale/hung background refresh never permanently
      // blocks user-initiated writes (e.g. form submissions).
      lock: async (name, acquireTimeout, fn) => {
        if (typeof navigator !== 'undefined' && navigator.locks) {
          if (acquireTimeout <= 0) {
            // Indefinite wait explicitly requested — honour it.
            return navigator.locks.request(name, fn)
          }
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), acquireTimeout)
          try {
            return await navigator.locks.request(name, { signal: controller.signal }, fn)
          } catch (err) {
            if ((err as DOMException).name === 'AbortError') {
              // Lock acquisition timed out (background refresh stalled).
              // Call fn() without the lock so the operation can proceed.
              return fn()
            }
            throw err
          } finally {
            clearTimeout(timer)
          }
        }
        return fn()
      },
    },
    realtime: {
      params: {
        // Throttle broadcast events to avoid overwhelming the client on busy channels
        eventsPerSecond: 10,
      },
    },
  }
)
