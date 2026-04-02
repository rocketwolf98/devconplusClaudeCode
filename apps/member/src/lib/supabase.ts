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
      // Keep navigator.locks serialization to prevent concurrent token-refresh
      // races (multiple stores firing getSession() simultaneously), but remove
      // the default 10 s acquire timeout. On a single-tab mobile app the lock
      // is always released quickly — waiting indefinitely is safe and avoids
      // the cascade where a timed-out waiter fires its own refresh with an
      // already-consumed refresh token, causing a 401 on the next invoke.
      lock: async (name, _acquireTimeout, fn) => {
        if (typeof navigator !== 'undefined' && navigator.locks) {
          return navigator.locks.request(name, fn)
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
