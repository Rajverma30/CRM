import * as XLSX from 'xlsx'
import type { BusinessLead } from './types'

const EXPORT_COLUMNS: Array<[keyof BusinessLead, string]> = [
  ['name', 'Business Name'],
  ['rating', 'Rating'],
  ['review_count', 'Reviews'],
  ['category', 'Category'],
  ['phone', 'Phone'],
  ['website', 'Website'],
  ['address', 'Address'],
  ['google_maps_url', 'Google Maps URL'],
  ['place_id', 'Place ID'],
  ['latitude', 'Latitude'],
  ['longitude', 'Longitude'],
  ['lead_score', 'Lead Score'],
]

function toRows(leads: BusinessLead[]) {
  return leads.map(lead => {
    const row: Record<string, string | number | null> = {}
    for (const [key, label] of EXPORT_COLUMNS) {
      row[label] = lead[key] ?? null
    }
    return row
  })
}

export function exportCsv(leads: BusinessLead[]): Buffer {
  const rows = toRows(leads)
  const headers = EXPORT_COLUMNS.map(([, label]) => label)
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = row[h]
          if (val == null) return ''
          const str = String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(',')
    ),
  ]
  return Buffer.from('\uFEFF' + lines.join('\n'), 'utf-8')
}

export function exportXlsx(leads: BusinessLead[]): Buffer {
  const rows = toRows(leads)
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}

export function exportFilename(businessType: string, location: string, ext: string): string {
  const safeType = businessType.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)
  const safeLoc = location.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)
  return `leads_${safeType}_${safeLoc}.${ext}`
}
