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

// Callback registered by the active layout — called when a heartbeat detects
// the socket is down. Set via onRealtimeDisconnect(); cleared on layout unmount.
let _onDisconnect: (() => void) | null = null

/**
 * Register a callback that fires whenever the Realtime heartbeat detects the
 * WebSocket is down ('disconnected' or 'timeout' status). This uses the official
 * onHeartbeat API rather than internal hooks, so it cannot race the built-in
 * auto-reconnect timer.
 * Returns a cleanup function that unregisters the callback.
 */
export function onRealtimeDisconnect(cb: () => void): () => void {
  _onDisconnect = cb
  return () => { if (_onDisconnect === cb) _onDisconnect = null }
}

// Use the official onHeartbeat API to detect silent disconnects.
// The heartbeat fires every 25 s. If the socket is down it gets status
// 'disconnected'; if the server stopped replying it gets 'timeout'.
// In both cases: reconnect the transport (safe — heartbeat only runs when the
// socket is already confirmed down, so connect() cannot race a CONNECTING socket).
// Then notify the layout to resubscribe channels.
supabase.realtime.onHeartbeat((status) => {
  if (status === 'disconnected' || status === 'timeout') {
    supabase.realtime.connect()
    _onDisconnect?.()
  }
})
