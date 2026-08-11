import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await serverSupabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, phone, role, department, joining_date } = body

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        tenant_id: callerProfile.tenant_id,
        email,
        full_name,
        phone: phone || null,
        role: role || 'employee',
        department: department || null,
        joining_date: joining_date || null,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
