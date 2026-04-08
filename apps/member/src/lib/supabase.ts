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
      // Run the Realtime heartbeat in a Web Worker so browser tab-throttling
      // cannot kill the 25 s ping and silently close the WebSocket.
      worker: true,
      params: {
        // Throttle broadcast events to avoid overwhelming the client on busy channels
        eventsPerSecond: 10,
      },
    },
  }
)

// Callbacks registered by the active layout — called when the Phoenix socket
// closes unexpectedly (network drop, server-side timeout, etc.)
let _onDisconnect: (() => void) | null = null

/**
 * Register a callback that fires whenever the Realtime WebSocket closes.
 * The layout uses this to immediately recover + resubscribe rather than
 * waiting for the next visibilitychange / online event.
 * Returns a cleanup function that unregisters the callback.
 */
export function onRealtimeDisconnect(cb: () => void): () => void {
  _onDisconnect = cb
  return () => { if (_onDisconnect === cb) _onDisconnect = null }
}

// Wire Phoenix socket lifecycle hooks once the client exists.
// `conn` is the underlying RealtimeClient; it exposes `onClose` and `onError`
// from the Phoenix socket API.
supabase.realtime.setCustomHeartbeatCallback?.(() => {
  // no-op — heartbeat is managed by the Web Worker; this just confirms the API
  // is available and the worker mode is active.
})

// Attach to socket close so any silent drop triggers immediate recovery.
// `supabase.realtime` is the RealtimeClient from @supabase/realtime-js.
// It connects lazily, so we hook into its connect event to attach the
// onClose handler after the socket is established.
const _origConnect = supabase.realtime.connect.bind(supabase.realtime)
supabase.realtime.connect = function (...args) {
  const result = _origConnect(...args)
  // After connecting, attach the close handler to the live socket.
  // The Phoenix socket surfaces itself as supabase.realtime.conn
  const conn = (supabase.realtime as unknown as { conn?: { onClose: (cb: () => void) => void } }).conn
  if (conn?.onClose) {
    conn.onClose(() => {
      if (_onDisconnect) _onDisconnect()
    })
  }
  return result
}
