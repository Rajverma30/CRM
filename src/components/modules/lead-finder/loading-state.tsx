'use client'

import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export function LeadFinderLoadingState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8">
        <LoadingSpinner />
        <p className="text-sm font-medium">Searching Google Places and applying filters…</p>
        <p className="text-xs text-muted-foreground text-center max-w-md">
          Deep search may take longer because multiple geographic queries are combined and deduplicated.
        </p>
      </CardContent>
    </Card>
  )
}
