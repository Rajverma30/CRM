'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { BusinessLead } from '@/lib/lead-finder/types'

interface ResultsTableProps {
  businesses: BusinessLead[]
}

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 70 ? 'default' : score >= 40 ? 'secondary' : 'outline'
  return <Badge variant={variant}>{score}</Badge>
}

function CellValue({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>
  }
  return <>{value}</>
}

export function LeadFinderResultsTable({ businesses }: ResultsTableProps) {
  if (!businesses.length) return null

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-50">
            <tr>
              {[
                'Business Name',
                'Rating',
                'Reviews',
                'Category',
                'Phone',
                'Website',
                'Address',
                'Google Maps',
                'Lead Score',
              ].map(heading => (
                <th
                  key={heading}
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {businesses.map(biz => (
              <tr key={biz.place_id} className="border-t transition hover:bg-muted/50">
                <td className="max-w-[220px] px-4 py-3 font-medium">
                  {biz.google_maps_url ? (
                    <a
                      href={biz.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      {biz.name}
                    </a>
                  ) : (
                    biz.name
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <CellValue value={biz.rating?.toFixed(1)} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <CellValue value={biz.review_count} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <CellValue value={biz.category} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <CellValue value={biz.phone ?? biz.international_phone} />
                </td>
                <td className="max-w-[180px] truncate px-4 py-3">
                  {biz.website ? (
                    <a
                      href={biz.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Visit
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No website</span>
                  )}
                </td>
                <td className="max-w-[260px] px-4 py-3 text-muted-foreground">
                  <CellValue value={biz.address} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {biz.google_maps_url ? (
                    <a
                      href={biz.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Open map
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={biz.lead_score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
