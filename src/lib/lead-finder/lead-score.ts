export function calculateLeadScore(params: {
  website: string | null | undefined
  rating: number | null | undefined
  phone: string | null | undefined
  international_phone: string | null | undefined
  review_count: number | null | undefined
}): number {
  let score = 0

  if (!params.website) score += 40

  if (params.rating != null) {
    if (params.rating < 3.0) score += 25
    else if (params.rating <= 4.0) score += 10
  }

  if (params.phone || params.international_phone) score += 15

  if (params.review_count != null && params.review_count > 50) score += 10

  return Math.min(score, 100)
}

export function isPotentialWebDevLead(params: {
  website: string | null | undefined
  rating: number | null | undefined
  phone: string | null | undefined
  international_phone: string | null | undefined
  review_count: number | null | undefined
  min_score?: number
}): boolean {
  const minScore = params.min_score ?? 55
  const hasPhone = Boolean(params.phone || params.international_phone)
  const noWebsite = !params.website
  const lowRating = params.rating != null && params.rating < 4.0
  const significantReviews = params.review_count != null && params.review_count >= 10

  if (noWebsite && hasPhone && (lowRating || significantReviews)) return true

  return calculateLeadScore(params) >= minScore
}
