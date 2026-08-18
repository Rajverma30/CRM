import type { ApiErrorDetail, BusinessLead, SearchFormState, SearchResponse } from './types'

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    const detail = data.detail as ApiErrorDetail | string | undefined
    if (typeof detail === 'string') return detail
    if (detail?.message) return detail.message
    return `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function searchBusinesses(params: SearchFormState): Promise<SearchResponse> {
  const body = {
    business_type: params.business_type.trim(),
    location: params.location.trim(),
    min_rating: params.min_rating,
    max_rating: params.max_rating,
    website_filter: params.website_filter,
    phone_filter: params.phone_filter,
    min_reviews: params.min_reviews,
    max_reviews: params.max_reviews.trim() === '' ? null : Number(params.max_reviews),
    potential_web_dev_leads: params.potential_web_dev_leads,
    deep_search: params.deep_search,
    page: 1,
    page_size: 2000,
  }

  const response = await fetch('/api/lead-finder/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(await parseError(response))
  return response.json()
}

export async function downloadCachedExport(
  format: 'csv' | 'xlsx',
  businesses: BusinessLead[],
  meta: { business_type: string; location: string }
): Promise<void> {
  if (!businesses.length) {
    throw new Error('No cached results to export. Run a search first.')
  }

  const response = await fetch('/api/lead-finder/export/cached', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format,
      businesses,
      business_type: meta.business_type,
      location: meta.location,
    }),
  })

  if (!response.ok) throw new Error(await parseError(response))

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const filename =
    match?.[1] ??
    `leads_${meta.business_type}_${meta.location}.${format}`.replace(/\s+/g, '_')

  triggerDownload(blob, filename)
}
