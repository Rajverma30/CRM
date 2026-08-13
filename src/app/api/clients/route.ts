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
    const {
      business_name,
      contact_person,
      phone,
      phone_2,
      email,
      address,
      industry,
      website_url,
      notes,
      status,
      service_ids,
    } = body

    if (!business_name?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const baseRow = {
      tenant_id: callerProfile.tenant_id,
      business_name: business_name.trim(),
      contact_person: contact_person?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      industry: industry?.trim() || null,
      website_url: website_url?.trim() || null,
      notes: notes?.trim() || null,
      status: status || 'active',
    }

    let client
    let insertError

    const withPhone2 = { ...baseRow, phone_2: phone_2?.trim() || null }
    const first = await adminClient.from('clients').insert(withPhone2 as never).select().single()
    client = first.data
    insertError = first.error

    // phone_2 column may not exist until migration 007 is applied
    if (insertError && /phone_2/i.test(insertError.message)) {
      const fallback = await adminClient.from('clients').insert(baseRow as never).select().single()
      client = fallback.data
      insertError = fallback.error
    }

    if (insertError || !client) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create client' }, { status: 500 })
    }

    if (Array.isArray(service_ids) && service_ids.length > 0) {
      const { error: svcError } = await adminClient
        .from('client_services')
        .insert(service_ids.map((sid: string) => ({ client_id: client.id, service_id: sid })))
      if (svcError) {
        return NextResponse.json({ error: svcError.message }, { status: 500 })
      }
    }

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
