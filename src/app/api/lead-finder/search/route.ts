import { NextRequest, NextResponse } from 'next/server'
import { requireLeadFinderAdmin } from '@/lib/lead-finder/auth'
import { getLeadFinderConfig } from '@/lib/lead-finder/config'
import { validateSearchRequest } from '@/lib/lead-finder/parse-locations'
import { PlacesAPIError, PlacesService } from '@/lib/lead-finder/places'
import { checkRateLimit, clientIp, RateLimitError } from '@/lib/lead-finder/rate-limit'
import type { SearchRequest } from '@/lib/lead-finder/types'

export async function POST(request: NextRequest) {
  const auth = await requireLeadFinderAdmin()
  if ('error' in auth && auth.error) return auth.error

  try {
    const config = getLeadFinderConfig()
    checkRateLimit(clientIp(request), config.rateLimitPerMinute)

    const body = await request.json()
    const validationError = validateSearchRequest(body)
    if (validationError) {
      return NextResponse.json(
        { detail: { message: validationError, code: 'validation_error' } },
        { status: 422 }
      )
    }

    const searchRequest: SearchRequest = {
      business_type: body.business_type.trim(),
      location: body.location.trim(),
      min_rating: body.min_rating ?? 0,
      max_rating: body.max_rating ?? 5,
      website_filter: body.website_filter ?? 'all',
      phone_filter: body.phone_filter ?? 'all',
      min_reviews: body.min_reviews ?? 0,
      max_reviews: body.max_reviews ?? null,
      potential_web_dev_leads: Boolean(body.potential_web_dev_leads),
      deep_search: Boolean(body.deep_search),
      page: body.page ?? 1,
      page_size: body.page_size ?? 2000,
    }

    const service = new PlacesService()
    const result = await service.search(searchRequest)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { detail: { message: error.message, code: 'rate_limited' } },
        { status: 429 }
      )
    }
    if (error instanceof PlacesAPIError) {
      return NextResponse.json(
        { detail: { message: error.message, code: error.code } },
        { status: error.statusCode }
      )
    }
    console.error('Lead finder search error:', error)
    return NextResponse.json(
      { detail: { message: 'An unexpected server error occurred.', code: 'internal_error' } },
      { status: 500 }
    )
  }
}
