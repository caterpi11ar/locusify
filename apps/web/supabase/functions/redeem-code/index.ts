import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getUserFromJWT } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  try {
    const { id: userId } = getUserFromJWT(req)

    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const normalizedCode = code.trim().toUpperCase()

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Look up the code
    const { data: codeRow, error: lookupError } = await adminClient
      .from('redemption_codes')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle()

    if (lookupError || !codeRow) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate code state
    if (!codeRow.is_active) {
      return new Response(JSON.stringify({ error: 'code_inactive' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'code_expired' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (codeRow.current_uses >= codeRow.max_uses) {
      return new Response(JSON.stringify({ error: 'code_fully_used' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if user already redeemed this code
    const { data: existing } = await adminClient
      .from('redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('code_id', codeRow.id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'already_redeemed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Atomic increment: use RPC to prevent race condition
    const { data: incremented, error: incrementError } = await adminClient
      .rpc('atomic_increment_code_uses', {
        p_code_id: codeRow.id,
        p_max_uses: codeRow.max_uses,
      })

    if (incrementError || !incremented) {
      return new Response(JSON.stringify({ error: 'code_fully_used' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Calculate subscription period
    const now = new Date()
    const periodEnd = new Date(now.getTime() + codeRow.duration_days * 24 * 60 * 60 * 1000)

    // Update subscription
    await adminClient
      .from('subscriptions')
      .update({
        plan: codeRow.plan,
        status: 'active',
        provider: 'redemption',
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      })
      .eq('user_id', userId)

    // Record the redemption
    await adminClient
      .from('redemptions')
      .insert({
        code_id: codeRow.id,
        user_id: userId,
        plan: codeRow.plan,
        duration_days: codeRow.duration_days,
      })

    return new Response(JSON.stringify({
      success: true,
      plan: codeRow.plan,
      duration_days: codeRow.duration_days,
      period_end: periodEnd.toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
