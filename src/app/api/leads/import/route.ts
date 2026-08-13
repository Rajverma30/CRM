import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseLeadsExcel, type ExcelLeadRow } from '@/lib/leads/parse-excel'

const BATCH_SIZE = 100

function buildNotes(lead: ExcelLeadRow): string | null {
  const parts = [
    lead.address && `Address: ${lead.address}`,
    lead.google_maps_url && `Maps: ${lead.google_maps_url}`,
    lead.place_id && `Place ID: ${lead.place_id}`,
    lead.rating != null && `Rating: ${lead.rating}`,
    lead.reviews != null && `Reviews: ${lead.reviews}`,
    lead.latitude != null && lead.longitude != null && `Coords: ${lead.latitude}, ${lead.longitude}`,
    lead.lead_score != null && `Lead Score: ${lead.lead_score}`,
  ].filter(Boolean)
  return parts.length ? parts.join('\n') : null
}

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

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Excel file required' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only .xlsx, .xls, or .csv files allowed' },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    let parsed: ExcelLeadRow[]
    try {
      parsed = parseLeadsExcel(buffer)
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to parse Excel' },
        { status: 400 }
      )
    }

    if (!parsed.length) {
      return NextResponse.json({ error: 'Excel mein koi valid lead nahi mili' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const fullRows = parsed.map(lead => ({
      tenant_id: callerProfile.tenant_id,
      business_name: lead.business_name,
      phone: lead.phone,
      website: lead.website,
      address: lead.address,
      industry: lead.industry,
      rating: lead.rating,
      reviews: lead.reviews != null ? Math.round(lead.reviews) : null,
      google_maps_url: lead.google_maps_url,
      place_id: lead.place_id,
      latitude: lead.latitude,
      longitude: lead.longitude,
      lead_score: lead.lead_score != null ? Math.round(lead.lead_score) : null,
      source: 'google_maps' as const,
      status: 'new' as const,
      _source: lead,
    }))

    let inserted = 0
    const errors: string[] = []
    let usedFallback = false

    for (let i = 0; i < fullRows.length; i += BATCH_SIZE) {
      const batch = fullRows.slice(i, i + BATCH_SIZE)
      const payload = batch.map(({ _source, ...row }) => row)
      const { error } = await adminClient.from('leads').insert(payload as never)

      if (error) {
        if (/address|rating|reviews|google_maps|place_id|latitude|longitude|lead_score/i.test(error.message)) {
          usedFallback = true
          const fallback = batch.map(({ tenant_id, business_name, phone, website, industry, source, status, _source }) => ({
            tenant_id,
            business_name,
            phone,
            website,
            industry,
            source,
            status,
            notes: buildNotes(_source),
          }))
          const { error: fbError } = await adminClient.from('leads').insert(fallback as never)
          if (fbError) {
            errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${fbError.message}`)
          } else {
            inserted += fallback.length
          }
        } else {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        }
      } else {
        inserted += batch.length
      }
    }

    if (!inserted && errors.length) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
    }

    return NextResponse.json({
      imported: inserted,
      total: fullRows.length,
      usedFallback,
      errors: errors.length ? errors : undefined,
    })
  } catch (error) {
    console.error('Import leads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
