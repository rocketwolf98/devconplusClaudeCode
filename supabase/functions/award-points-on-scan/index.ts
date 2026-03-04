// award-points-on-scan Edge Function
// Deploy: supabase functions deploy award-points-on-scan
//
// Input:  { qr_code_token: string, organizer_id: string }
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
    const { qr_code_token, organizer_id } = await req.json() as {
      qr_code_token: string
      organizer_id: string
    }

    if (!qr_code_token || !organizer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Validate organizer role
    const { data: organizer, error: orgError } = await supabase
      .from('profiles')
      .select('id, role, chapter_id')
      .eq('id', organizer_id)
      .in('role', ['chapter_officer', 'hq_admin', 'super_admin'])
      .single()

    if (orgError || !organizer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: not an organizer.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Find registration by QR token (must be approved and not yet checked in)
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

    if (reg.checked_in) {
      return new Response(
        JSON.stringify({ success: false, error: 'This member has already checked in.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Get event details (points_value, title)
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

    // 4. Get member profile
    const { data: member } = await supabase
      .from('profiles')
      .select('full_name, total_points')
      .eq('id', reg.user_id)
      .single()

    // 5. Mark as checked in
    await supabase
      .from('event_registrations')
      .update({ checked_in: true })
      .eq('id', reg.id)

    // 6. Insert point transaction
    await supabase.from('point_transactions').insert({
      user_id:     reg.user_id,
      amount:      event.points_value,
      description: `Attended: ${event.title}`,
      source:      'event_attendance',
    })

    // 7. Update profile total_points
    const currentPoints = member?.total_points ?? 0
    await supabase
      .from('profiles')
      .update({ total_points: currentPoints + event.points_value })
      .eq('id', reg.user_id)

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
