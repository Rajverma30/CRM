import * as XLSX from 'xlsx'

export interface ExcelLeadRow {
  business_name: string
  phone?: string | null
  website?: string | null
  address?: string | null
  industry?: string | null
  rating?: number | null
  reviews?: number | null
  google_maps_url?: string | null
  place_id?: string | null
  latitude?: number | null
  longitude?: number | null
  lead_score?: number | null
}

/** Normalize Excel header text for matching */
function normHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '')
}

const HEADER_MAP: Record<string, keyof ExcelLeadRow> = {
  businessn: 'business_name',
  businessname: 'business_name',
  business: 'business_name',
  name: 'business_name',
  rating: 'rating',
  reviews: 'reviews',
  review: 'reviews',
  category: 'industry',
  industry: 'industry',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  website: 'website',
  websiteurl: 'website',
  url: 'website',
  address: 'address',
  googlema: 'google_maps_url',
  googlemaps: 'google_maps_url',
  googlemapslink: 'google_maps_url',
  googlemap: 'google_maps_url',
  mapslink: 'google_maps_url',
  mapsurl: 'google_maps_url',
  placeid: 'place_id',
  latitude: 'latitude',
  lat: 'latitude',
  longitude: 'longitude',
  lng: 'longitude',
  lon: 'longitude',
  leadscore: 'lead_score',
  score: 'lead_score',
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s || null
}

function mapHeaders(headers: unknown[]): Partial<Record<keyof ExcelLeadRow, number>> {
  const map: Partial<Record<keyof ExcelLeadRow, number>> = {}
  headers.forEach((h, i) => {
    const key = HEADER_MAP[normHeader(h)]
    if (key && map[key] === undefined) map[key] = i
  })
  return map
}

export function parseLeadsExcel(buffer: ArrayBuffer): ExcelLeadRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][]

  if (!rows.length) return []

  const colMap = mapHeaders(rows[0] ?? [])
  if (colMap.business_name === undefined) {
    throw new Error(
      'Excel mein "Business Name" column nahi mila. Pehli row headers honi chahiye.'
    )
  }

  const leads: ExcelLeadRow[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || !row.length) continue

    const business_name = toText(row[colMap.business_name!])
    if (!business_name) continue

    leads.push({
      business_name,
      phone: colMap.phone !== undefined ? toText(row[colMap.phone]) : null,
      website: colMap.website !== undefined ? toText(row[colMap.website]) : null,
      address: colMap.address !== undefined ? toText(row[colMap.address]) : null,
      industry: colMap.industry !== undefined ? toText(row[colMap.industry]) : null,
      rating: colMap.rating !== undefined ? toNumber(row[colMap.rating]) : null,
      reviews: colMap.reviews !== undefined ? toNumber(row[colMap.reviews]) : null,
      google_maps_url:
        colMap.google_maps_url !== undefined ? toText(row[colMap.google_maps_url]) : null,
      place_id: colMap.place_id !== undefined ? toText(row[colMap.place_id]) : null,
      latitude: colMap.latitude !== undefined ? toNumber(row[colMap.latitude]) : null,
      longitude: colMap.longitude !== undefined ? toNumber(row[colMap.longitude]) : null,
      lead_score: colMap.lead_score !== undefined ? toNumber(row[colMap.lead_score]) : null,
    })
  }

  return leads
}
