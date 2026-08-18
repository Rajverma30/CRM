const LOCATION_SPLIT = /[\n;,]+/

export function parseLocations(raw: string): string[] {
  const seen = new Set<string>()
  const locations: string[] = []

  for (const part of raw.split(LOCATION_SPLIT)) {
    const cleaned = part.trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    locations.push(cleaned)
  }

  return locations
}

export function validateSearchRequest(body: {
  business_type?: string
  location?: string
  min_rating?: number
  max_rating?: number
  min_reviews?: number
  max_reviews?: number | null
}): string | null {
  const businessType = body.business_type?.trim()
  const location = body.location?.trim()

  if (!businessType) return 'Business category is required'
  if (!location) return 'Location is required'

  const locations = parseLocations(location)
  if (!locations.length) return 'Enter at least one location'
  if (locations.length > 15) return 'Maximum 15 locations per search'

  const minRating = body.min_rating ?? 0
  const maxRating = body.max_rating ?? 5
  if (minRating > maxRating) return 'Minimum rating cannot be greater than maximum rating'

  const minReviews = body.min_reviews ?? 0
  if (body.max_reviews != null && minReviews > body.max_reviews) {
    return 'Minimum reviews cannot be greater than maximum reviews'
  }

  return null
}
