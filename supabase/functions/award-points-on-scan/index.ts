// award-points-on-scan Edge Function
// Deploy: supabase functions deploy award-points-on-scan
//
// Input:  { token: string }  — short-lived JWT from generate-qr-token
// Output: { success: boolean, member_name?: string, points_awarded?: number,
//           event_title?: string, already_checked_in?: boolean, error?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

// Decode 22-char base64url back to standard UUID string
function compactToUuid(compact: string): string {
  const pad = (4 - compact.length % 4) % 4
  const b64 = compact.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad)
  const bin = atob(b64)
  const hex = Array.from(bin).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      // Return 200 so client can read the structured error body
      return new Response(
        JSON.stringify({ success: false, error: isExpired ? 'token_expired' : 'invalid_token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Get event details (points_value, title)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, points_value')
      .eq('id', reg.event_id)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ success: false, error: 'Event not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Get member name for response (needed for both success and already-checked-in paths)
    const { data: member } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', reg.user_id)
      .single()

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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    return new Response(
      JSON.stringify({
        success:        true,
        member_name:    member?.full_name ?? 'Member',
        points_awarded: event.points_value,
        event_title:    event.title,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
