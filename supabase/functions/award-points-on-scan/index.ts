// award-points-on-scan Edge Function
// Deploy: supabase functions deploy award-points-on-scan
//
// Input:  { qr_code_token: string }
// Output: { success: boolean, member_name?: string, points_awarded?: number, event_title?: string, error?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Use service role to bypass RLS for data operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Verify caller identity from JWT — never trust organizer_id from request body
    const authHeader = req.headers.get('Authorization')
    const { data: { user: callerUser }, error: authErr } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') ?? ''
    )
    if (authErr || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { qr_code_token } = await req.json() as { qr_code_token: string }

    if (!qr_code_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validate caller has organizer role
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

    // 3. Find registration by QR token (must be approved)
    const { data: reg, error: regError } = await supabase
      .from('event_registrations')
      .select('id, user_id, event_id, status, checked_in')
      .eq('qr_code_token', qr_code_token)
      .eq('status', 'approved')
      .single()

    if (regError || !reg) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or unrecognized QR code.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Get event details (points_value, title)
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

    // 5. Get member name for response
    const { data: member } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', reg.user_id)
      .single()

    // 6. Atomically claim check-in: only succeeds if checked_in is still false.
    //    This prevents double-award from concurrent scan requests.
    const { data: claimed, error: claimErr } = await supabase
      .from('event_registrations')
      .update({ checked_in: true })
      .eq('id', reg.id)
      .eq('checked_in', false)
      .select('id')
      .maybeSingle()

    if (claimErr || !claimed) {
      return new Response(
        JSON.stringify({ success: false, error: 'This member has already checked in.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Insert point transaction
    await supabase.from('point_transactions').insert({
      user_id:     reg.user_id,
      amount:      event.points_value,
      description: `Attended: ${event.title}`,
      source:      'event_attendance',
    })

    // 8. Atomically increment total_points — avoids read-modify-write race
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
