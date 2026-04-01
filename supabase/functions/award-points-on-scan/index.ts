// award-points-on-scan Edge Function
// Deploy: supabase functions deploy award-points-on-scan
//
// Input:  { token: string }  — short-lived JWT from generate-qr-token
// Output: { success: boolean, member_name?: string, points_awarded?: number,
//           event_title?: string, already_checked_in?: boolean, error?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'
import { logger } from '../_shared/logger.ts'

// Decode 22-char base64url back to standard UUID string
function compactToUuid(compact: string): string {
  const pad = (4 - compact.length % 4) % 4
  const b64 = compact.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad)
  const bin = atob(b64)
  const hex = Array.from(bin).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'https://devconplus.vercel.app',
  'https://devconplusbeta-v1.vercel.app',
])

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // 1. Verify caller identity — anon client with user JWT in global headers (correct Supabase pattern)
    const authHeader = req.headers.get('Authorization')
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader ?? '' } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )
    const { data: { user: callerUser }, error: authErr } = await supabaseAuth.auth.getUser()
    if (authErr || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized.' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Service role client for data operations — bypasses RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { token } = await req.json() as { token: string }

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields.' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verify QR JWT signature and expiry — signing secret never leaves the server
    let registrationId: string
    try {
      const rawSecret = Deno.env.get('QR_JWT_SECRET') ?? ''
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(rawSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      )
      const payload = await verify(token, key)
      registrationId = compactToUuid(payload.sub as string)
    } catch (jwtErr) {
      const isExpired = jwtErr instanceof Error && jwtErr.message.toLowerCase().includes('expired')
      logger.warn('qr_scan_invalid_token', {
        reason: isExpired ? 'token_expired' : 'invalid_token',
        token_prefix: typeof token === 'string' ? token.slice(0, 8) : 'unknown',
      })
      // Return 200 so client can read the structured error body
      return new Response(
        JSON.stringify({ success: false, error: isExpired ? 'token_expired' : 'invalid_token' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validate caller has organizer role
    const { data: organizer, error: orgError } = await supabase
      .from('profiles')
      .select('id, role, chapter_id')
      .eq('id', callerUser.id)
      .in('role', ['chapter_officer', 'hq_admin', 'super_admin'])
      .single()

    if (orgError || !organizer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: not an organizer.' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Rate limit: 60 scans per organizer per 60s (~1 scan/sec — sufficient for busy events).
    // Uses service_role client — check_rate_limit RPC is restricted to service_role.
    // Fail closed — any RPC error returns 429 (protects the points ecosystem).
    // Note: double-award prevention is handled by the checked_in atomic guard below,
    //       not by this rate limit.
    const { data: rlAllowed, error: rlError } = await supabase.rpc('check_rate_limit', {
      p_identifier: `user:${organizer.id}`,
      p_bucket:     'qr_scan',
    })
    if (rlError || !rlAllowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Scan rate exceeded. Please slow down.' }),
        { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'Retry-After': '60' } }
      )
    }

    // 4. Find registration by ID extracted from JWT (must be approved)
    const { data: reg, error: regError } = await supabase
      .from('event_registrations')
      .select('id, user_id, event_id, status, checked_in')
      .eq('id', registrationId)
      .eq('status', 'approved')
      .single()

    if (regError || !reg) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or unrecognized QR code.' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // 5. Get event details (points_value, title, chapter_id for scope check)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, points_value, chapter_id, is_chapter_locked')
      .eq('id', reg.event_id)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ success: false, error: 'Event not found.' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // 5b. Chapter scoping: chapter_officers can only scan QRs for events in their chapter.
    //     hq_admin and super_admin bypass this check (they manage all chapters).
    if (
      organizer.role === 'chapter_officer' &&
      organizer.chapter_id &&
      event.chapter_id !== organizer.chapter_id
    ) {
      logger.warn('qr_scan_chapter_mismatch', {
        organizer_id: organizer.id,
        organizer_chapter: organizer.chapter_id,
        event_chapter: event.chapter_id,
        event_id: event.id,
      })
      return new Response(
        JSON.stringify({ success: false, error: 'This QR is for a different chapter\'s event.' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // 6. Get member name + chapter for response and chapter-lock check
    const { data: member } = await supabase
      .from('profiles')
      .select('full_name, chapter_id')
      .eq('id', reg.user_id)
      .single()

    // 6b. Chapter-lock enforcement: if the event is locked to its chapter,
    //     reject check-in for members from other chapters.
    if (
      event.is_chapter_locked === true &&
      member?.chapter_id &&
      event.chapter_id !== member.chapter_id
    ) {
      logger.warn('qr_scan_chapter_locked', {
        member_id: reg.user_id,
        member_chapter: member.chapter_id,
        event_chapter: event.chapter_id,
        event_id: event.id,
      })
      return new Response(
        JSON.stringify({ success: false, error: 'This event is locked to its home chapter.' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // 7. Atomically claim check-in: only succeeds if checked_in is still false.
    //    This prevents double-award from concurrent scan requests.
    const { data: claimed, error: claimErr } = await supabase
      .from('event_registrations')
      .update({ checked_in: true })
      .eq('id', reg.id)
      .eq('checked_in', false)
      .select('id')
      .maybeSingle()

    if (claimErr || !claimed) {
      // Return 200 so client can read the structured body
      return new Response(
        JSON.stringify({
          success: false,
          already_checked_in: true,
          member_name: member?.full_name ?? 'Member',
        }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // 8. Insert point transaction
    await supabase.from('point_transactions').insert({
      user_id:     reg.user_id,
      amount:      event.points_value,
      description: `Attended: ${event.title}`,
      source:      'event_attendance',
    })

    // 9. Atomically increment total_points — avoids read-modify-write race
    await supabase.rpc('increment_member_points', {
      p_user_id: reg.user_id,
      p_amount:  event.points_value,
    })

    logger.info('qr_scan_success', {
      member_id:      reg.user_id,
      event_id:       reg.event_id,
      points_awarded: event.points_value,
    })

    return new Response(
      JSON.stringify({
        success:        true,
        member_name:    member?.full_name ?? 'Member',
        points_awarded: event.points_value,
        event_title:    event.title,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    logger.error('qr_scan_error', { message: err instanceof Error ? err.message : 'Internal error.' })
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal error.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
