// supabase/functions/_shared/logger.ts
// Structured JSON logger for Edge Functions.
// All output goes to stdout — Supabase captures it in Dashboard → Logs → Edge Functions.

type LogLevel = 'info' | 'warn' | 'error'

function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...data,
  }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info:  (event: string, data?: Record<string, unknown>) => log('info',  event, data),
  warn:  (event: string, data?: Record<string, unknown>) => log('warn',  event, data),
  error: (event: string, data?: Record<string, unknown>) => log('error', event, data),
}
