import { getLeadFinderConfig } from './config'
import { calculateLeadScore, isPotentialWebDevLead } from './lead-score'
import { parseLocations } from './parse-locations'
import type { BusinessLead, PhoneFilter, SearchRequest, SearchResponse, WebsiteFilter } from './types'

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const METERS_PER_DEG_LAT = 111_320

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.location',
  'places.businessStatus',
  'nextPageToken',
].join(',')

type PlaceRecord = Record<string, unknown>

export class PlacesAPIError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode = 502, code = 'places_error') {
    super(message)
    this.name = 'PlacesAPIError'
    this.statusCode = statusCode
    this.code = code
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class PlacesService {
  private config = getLeadFinderConfig()

  constructor() {
    if (!this.config.googleMapsApiKey) {
      throw new PlacesAPIError(
        'GOOGLE_MAPS_API_KEY is not configured. Add it to your .env file.',
        500,
        'missing_api_key'
      )
    }
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const [filtered, rawCount] = await this.collectFiltered(request)
    const total = filtered.length
    const totalPages = total ? Math.max(1, Math.ceil(total / request.page_size)) : 1
    const page = Math.min(request.page, totalPages)
    const start = (page - 1) * request.page_size
    const pageItems = filtered.slice(start, start + request.page_size)
    const locations = parseLocations(request.location)

    return {
      businesses: pageItems,
      total,
      page,
      page_size: request.page_size,
      total_pages: totalPages,
      query: request.business_type,
      location: locations.join(', '),
      coverage_note:
        'Results are relevance-based from Google Places and may not include every business in the city. Multiple geographic queries and pagination were used to improve coverage where possible.',
      raw_fetched: rawCount,
      after_filters: total,
    }
  }

  private async collectFiltered(request: SearchRequest): Promise<[BusinessLead[], number]> {
    const locations = parseLocations(request.location)
    const rawPlaces: PlaceRecord[] = []
    const locationErrors: PlacesAPIError[] = []

    for (const loc of locations) {
      try {
        let center: [number, number] | null = null
        if (request.deep_search) {
          center = await this.tryGeocodeLocation(loc)
        }
        const batch = await this.fetchPlaces(request, loc, center)
        rawPlaces.push(...batch)
      } catch (exc) {
        if (exc instanceof PlacesAPIError) {
          locationErrors.push(exc)
          if (exc.code === 'quota_exceeded' && rawPlaces.length) break
        } else {
          throw exc
        }
      }
    }

    if (!rawPlaces.length && locationErrors.length) {
      throw locationErrors[0]
    }

    const deduped = this.deduplicate(rawPlaces)
    const leads = deduped.map(p => this.mapPlace(p))
    let filtered = this.applyFilters(leads, request)

    if (request.potential_web_dev_leads) {
      filtered.sort((a, b) => b.lead_score - a.lead_score)
    } else {
      filtered.sort((a, b) => {
        const aHasRating = a.rating != null
        const bHasRating = b.rating != null
        if (aHasRating !== bHasRating) return aHasRating ? 1 : -1
        const aRating = a.rating ?? -1
        const bRating = b.rating ?? -1
        if (aRating !== bRating) return bRating - aRating
        return (b.review_count ?? 0) - (a.review_count ?? 0)
      })
    }

    return [filtered, deduped.length]
  }

  private async tryGeocodeLocation(location: string): Promise<[number, number] | null> {
    const url = new URL(GEOCODE_URL)
    url.searchParams.set('address', location)
    url.searchParams.set('key', this.config.googleMapsApiKey)

    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      })
      const data = await response.json() as {
        status?: string
        results?: Array<{ geometry: { location: { lat: number; lng: number } } }>
        error_message?: string
      }

      const status = data.status
      if (status === 'OK' && data.results?.length) {
        const loc = data.results[0].geometry.location
        return [loc.lat, loc.lng]
      }

      return null
    } catch {
      return null
    }
  }

  private async fetchPlaces(
    request: SearchRequest,
    location: string,
    center: [number, number] | null
  ): Promise<PlaceRecord[]> {
    const jobs = this.buildSearchJobs(request, location, center)
    const results: PlaceRecord[] = []
    const errors: PlacesAPIError[] = []

    for (const job of jobs) {
      try {
        const batch = await this.textSearchPaginated(job, request.deep_search)
        results.push(...batch)
      } catch (exc) {
        if (exc instanceof PlacesAPIError) errors.push(exc)
        else throw exc
      }
    }

    if (results.length) return results
    if (errors.length) throw errors[0]
    return results
  }

  private buildSearchJobs(
    request: SearchRequest,
    location: string,
    center: [number, number] | null
  ): Array<Record<string, unknown>> {
    const textQuery = `${request.business_type} in ${location}`
    const radius = this.config.searchRadiusMeters

    if (!center) {
      const jobs: Array<Record<string, unknown>> = [{ textQuery, pageSize: 20 }]
      if (request.deep_search) {
        for (const variant of [
          `${request.business_type} near ${location}`,
          `best ${request.business_type} ${location}`,
        ]) {
          jobs.push({ textQuery: variant, pageSize: 20 })
        }
      }
      return jobs
    }

    const [lat, lng] = center
    const jobs: Array<Record<string, unknown>> = [
      {
        textQuery,
        pageSize: 20,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      },
    ]

    if (!request.deep_search) return jobs

    for (const [dlatM, dlngM] of this.gridOffsets(this.config.maxGridPoints)) {
      if (dlatM === 0 && dlngM === 0) continue
      const metersPerDegLng = METERS_PER_DEG_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.2)
      jobs.push({
        textQuery,
        pageSize: 20,
        locationBias: {
          circle: {
            center: {
              latitude: lat + dlatM / METERS_PER_DEG_LAT,
              longitude: lng + dlngM / metersPerDegLng,
            },
            radius: radius * 0.75,
          },
        },
      })
    }

    for (const variant of [
      `${request.business_type} near ${location}`,
      `best ${request.business_type} ${location}`,
    ]) {
      jobs.push({
        textQuery: variant,
        pageSize: 20,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      })
    }

    return jobs
  }

  private gridOffsets(maxPoints: number): Array<[number, number]> {
    const step = 5000
    const points: Array<[number, number]> = [[0, 0]]
    for (const y of [-1, 0, 1]) {
      for (const x of [-1, 0, 1]) {
        if (x === 0 && y === 0) continue
        points.push([y * step, x * step])
        if (points.length >= maxPoints) return points
      }
    }
    return points.slice(0, maxPoints)
  }

  private async textSearchPaginated(
    body: Record<string, unknown>,
    deep: boolean
  ): Promise<PlaceRecord[]> {
    const places: PlaceRecord[] = []
    let pageToken: string | undefined
    const maxPages = deep ? this.config.maxPagesPerQuery : 1

    for (let i = 0; i < maxPages; i++) {
      const payload = { ...body }
      if (pageToken) payload.pageToken = pageToken

      try {
        const data = await this.textSearchOnce(payload)
        places.push(...((data.places as PlaceRecord[]) ?? []))
        pageToken = data.nextPageToken as string | undefined
        if (!pageToken) break
        await sleep(500)
      } catch (exc) {
        if (exc instanceof PlacesAPIError && exc.code === 'quota_exceeded' && places.length) {
          return places
        }
        throw exc
      }
    }

    return places
  }

  private async textSearchOnce(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const retries = Math.max(0, this.config.placesRetryMax)
    let lastMessage = 'Unknown Places API error'

    for (let attempt = 0; attempt <= retries; attempt++) {
      let response: Response
      try {
        response = await fetch(PLACES_TEXT_SEARCH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.config.googleMapsApiKey,
            'X-Goog-FieldMask': FIELD_MASK,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        })
      } catch (exc) {
        throw new PlacesAPIError(
          `Network error while calling Places API: ${exc instanceof Error ? exc.message : exc}`,
          503,
          'network_error'
        )
      }

      if (response.status === 200) {
        return response.json()
      }

      let errorBody: Record<string, unknown> = {}
      try {
        errorBody = await response.json()
      } catch {
        errorBody = { message: await response.text() }
      }

      const errObj = errorBody.error as Record<string, unknown> | undefined
      lastMessage =
        (errObj?.message as string) ||
        (errorBody.message as string) ||
        'Unknown Places API error'

      if (response.status === 429 && attempt < retries) {
        await sleep(1500 * 2 ** attempt)
        continue
      }

      if (response.status === 401 || response.status === 403) {
        throw new PlacesAPIError(
          `Invalid or unauthorized Google API key: ${lastMessage}`,
          401,
          'invalid_api_key'
        )
      }
      if (response.status === 429) {
        throw new PlacesAPIError(
          'Google Places rate/quota limit hit. Wait 1–2 minutes, turn OFF Deep search, and search fewer cities at once.',
          429,
          'quota_exceeded'
        )
      }
      if (response.status === 400) {
        throw new PlacesAPIError(`Invalid Places API request: ${lastMessage}`, 400, 'invalid_request')
      }

      throw new PlacesAPIError(`Places API error (${response.status}): ${lastMessage}`, 502, 'places_error')
    }

    throw new PlacesAPIError(
      `Google Places rate/quota limit hit. (${lastMessage})`,
      429,
      'quota_exceeded'
    )
  }

  private deduplicate(places: PlaceRecord[]): PlaceRecord[] {
    const seen = new Set<string>()
    const unique: PlaceRecord[] = []
    for (const place of places) {
      const placeId = this.extractPlaceId(place)
      if (!placeId || seen.has(placeId)) continue
      seen.add(placeId)
      unique.push(place)
    }
    return unique
  }

  private extractPlaceId(place: PlaceRecord): string {
    const rawId = String(place.id ?? '')
    if (rawId.startsWith('places/')) return rawId.split('/', 2)[1]
    return rawId
  }

  private mapPlace(place: PlaceRecord): BusinessLead {
    const placeId = this.extractPlaceId(place)
    const displayName = place.displayName as { text?: string } | undefined
    const name = displayName?.text || 'Unknown business'

    let category: string | null = null
    const primaryType = place.primaryTypeDisplayName as { text?: string } | undefined
    if (primaryType?.text) {
      category = primaryType.text
    } else if (place.primaryType) {
      category = String(place.primaryType)
    } else {
      const types = place.types as string[] | undefined
      category = types?.[0]?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? null
    }

    const location = place.location as { latitude?: number; longitude?: number } | undefined
    const rating = place.rating != null ? Number(place.rating) : null
    const reviewCount = place.userRatingCount != null ? Number(place.userRatingCount) : null
    const phone = (place.nationalPhoneNumber as string) ?? null
    const intlPhone = (place.internationalPhoneNumber as string) ?? null
    const website = (place.websiteUri as string) ?? null
    let mapsUrl = (place.googleMapsUri as string) ?? null
    if (!mapsUrl && placeId) {
      mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`
    }

    const leadScore = calculateLeadScore({
      website,
      rating,
      phone,
      international_phone: intlPhone,
      review_count: reviewCount,
    })

    return {
      place_id: placeId,
      name,
      rating,
      review_count: reviewCount,
      category,
      address: (place.formattedAddress as string) ?? null,
      phone,
      international_phone: intlPhone,
      website,
      google_maps_url: mapsUrl,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      business_status: (place.businessStatus as string) ?? null,
      lead_score: leadScore,
    }
  }

  private applyFilters(leads: BusinessLead[], request: SearchRequest): BusinessLead[] {
    const fullRatingRange = request.min_rating <= 0 && request.max_rating >= 5

    return leads.filter(lead => {
      if (lead.rating == null) {
        if (!fullRatingRange) return false
      } else if (lead.rating < request.min_rating || lead.rating > request.max_rating) {
        return false
      }

      const reviews = lead.review_count ?? 0
      if (reviews < request.min_reviews) return false
      if (request.max_reviews != null && reviews > request.max_reviews) return false

      const hasWebsite = Boolean(lead.website)
      if (request.website_filter === 'has_website' && !hasWebsite) return false
      if (request.website_filter === 'no_website' && hasWebsite) return false

      const hasPhone = Boolean(lead.phone || lead.international_phone)
      if (request.phone_filter === 'has_phone' && !hasPhone) return false
      if (request.phone_filter === 'no_phone' && hasPhone) return false

      if (request.potential_web_dev_leads) {
        return isPotentialWebDevLead({
          website: lead.website,
          rating: lead.rating,
          phone: lead.phone,
          international_phone: lead.international_phone,
          review_count: lead.review_count,
        })
      }

      return true
    })
  }
}

export type { WebsiteFilter, PhoneFilter }
