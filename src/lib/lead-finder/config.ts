export function getLeadFinderConfig() {
  return {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    rateLimitPerMinute: Number(process.env.LEAD_FINDER_RATE_LIMIT ?? 30),
    maxPagesPerQuery: Number(process.env.LEAD_FINDER_MAX_PAGES ?? 2),
    maxGridPoints: Number(process.env.LEAD_FINDER_MAX_GRID_POINTS ?? 5),
    searchRadiusMeters: Number(process.env.LEAD_FINDER_SEARCH_RADIUS ?? 8000),
    requestTimeoutMs: Number(process.env.LEAD_FINDER_REQUEST_TIMEOUT ?? 30000),
    placesMaxConcurrency: Number(process.env.LEAD_FINDER_PLACES_CONCURRENCY ?? 1),
    placesRetryMax: Number(process.env.LEAD_FINDER_PLACES_RETRY ?? 3),
  }
}
