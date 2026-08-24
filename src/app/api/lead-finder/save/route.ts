import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireLeadFinderAdmin } from '@/lib/lead-finder/auth'
import type { BusinessLead } from '@/lib/lead-finder/types'

const BATCH_SIZE = 100

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') || ''
}

function getDuplicateKeys(payload: {
  business_name: string
  phone?: string | null
  website?: string | null
  place_id?: string | null
}) {
  const keys = new Set<string>()
  const businessName = normalizeValue(payload.business_name)
  const phone = normalizeValue(payload.phone)
  const website = normalizeValue(payload.website)
  const placeId = normalizeValue(payload.place_id)

  if (placeId) keys.add(`place:${placeId}`)
  if (businessName && phone) keys.add(`name-phone:${businessName}|${phone}`)
  if (businessName && website) keys.add(`name-website:${businessName}|${website}`)
  if (businessName && !phone && !website) keys.add(`name:${businessName}`)

  return Array.from(keys)
}

function buildLeadPayload(business: BusinessLead, tenantId: string) {
  const trimmedName = business.name?.trim() || 'Unknown business'
  const trimmedPhone = business.phone || business.international_phone || null
  const categoryText = business.category?.toLowerCase() ?? ''
  const isRealEstate = categoryText.includes('real estate') || categoryText.includes('property') || categoryText.includes('builder') || categoryText.includes('broker')

  return {
    tenant_id: tenantId,
    business_name: trimmedName,
    phone: trimmedPhone,
    website: business.website || null,
    address: business.address || null,
    industry: business.category || null,
    rating: business.rating ?? null,
    reviews: business.review_count ?? null,
    google_maps_url: business.google_maps_url || null,
    place_id: business.place_id || null,
    latitude: business.latitude ?? null,
    longitude: business.longitude ?? null,
    lead_score: business.lead_score ?? null,
    source: 'google_maps' as const,
    interested_service: null,
    estimated_budget: null,
    notes: [
      business.category ? `Category: ${business.category}` : null,
      business.website ? `Website: ${business.website}` : null,
      business.google_maps_url ? `Maps: ${business.google_maps_url}` : null,
    ].filter(Boolean).join('\n') || null,
    status: 'new' as const,
    category: isRealEstate ? 'Real Estate' : null,
    subcategory: isRealEstate ? 'Broker / Agent' : null,
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireLeadFinderAdmin()
  if ('error' in auth && auth.error) return auth.error

  try {
    const body = await request.json()
    const businesses = Array.isArray(body?.businesses) ? body.businesses as BusinessLead[] : []

    if (!businesses.length) {
      return NextResponse.json({ detail: { message: 'No businesses to save.', code: 'no_businesses' } }, { status: 400 })
    }

    const serverSupabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await serverSupabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ detail: { message: 'Unauthorized', code: 'unauthorized' } }, { status: 401 })
    }

    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json({ detail: { message: 'Profile tenant not found', code: 'tenant_missing' } }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: existingLeads, error: existingError } = await adminClient
      .from('leads')
      .select('id, place_id, business_name, phone, website')
      .eq('tenant_id', profile.tenant_id)

    if (existingError) {
      throw existingError
    }

    const existingKeys = new Set<string>()
    for (const lead of existingLeads ?? []) {
      for (const key of getDuplicateKeys({
        business_name: lead.business_name,
        phone: lead.phone,
        website: lead.website,
        place_id: lead.place_id,
      })) {
        existingKeys.add(key)
      }
    }

    const seenKeys = new Set<string>()
    const normalized = businesses
      .filter(business => business?.name)
      .filter((business, index, list) => {
        const placeId = business.place_id?.trim()
        if (!placeId) return true
        return list.findIndex(item => (item.place_id || '').trim() === placeId) === index
      })
      .map(business => buildLeadPayload(business, profile.tenant_id))
      .filter(payload => {
        const duplicateKeys = getDuplicateKeys(payload)
        const isDuplicate = duplicateKeys.some(key => existingKeys.has(key) || seenKeys.has(key))
        duplicateKeys.forEach(key => seenKeys.add(key))
        return !isDuplicate
      })

    if (!normalized.length) {
      return NextResponse.json({ saved: 0, skipped_duplicates: true })
    }

    let inserted = 0
    const errors: string[] = []

    for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
      const batch = normalized.slice(i, i + BATCH_SIZE)
      const { error } = await adminClient.from('leads').insert(batch as never)

      if (error) {
        errors.push(`${error.message}`)
      } else {
        inserted += batch.length
      }
    }

    if (errors.length && !inserted) {
      return NextResponse.json({ detail: { message: errors.join('; '), code: 'insert_failed' } }, { status: 500 })
    }

    return NextResponse.json({
      saved: inserted,
      total: normalized.length,
      errors: errors.length ? errors : undefined,
      skipped_duplicates: true,
    })
  } catch (error) {
    console.error('Lead finder save error:', error)
    return NextResponse.json({ detail: { message: 'An unexpected server error occurred.', code: 'internal_error' } }, { status: 500 })
  }
}
