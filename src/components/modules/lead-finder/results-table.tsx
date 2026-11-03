'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Target } from 'lucide-react'
import type { BusinessLead } from '@/lib/lead-finder/types'

interface ResultsTableProps {
  businesses: BusinessLead[]
  onWhatsAppClick?: (biz: BusinessLead) => void
  onStrategyClick?: (biz: BusinessLead) => void
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

export function LeadFinderResultsTable({
  businesses,
  onWhatsAppClick,
  onStrategyClick,
}: ResultsTableProps) {
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
                'Actions',
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
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium"
                      onClick={() => onStrategyClick?.(biz)}
                      title="How to Grab this Lead (Strategy)"
                    >
                      <Target className="h-3.5 w-3.5 mr-1 text-indigo-500" /> Strategy
                    </Button>
                    {(biz.phone || biz.international_phone) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-medium"
                        onClick={() => onWhatsAppClick?.(biz)}
                        title="Send WhatsApp Pitch"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
