'use client'

import { Button } from '@/components/ui/button'

interface ExportButtonsProps {
  disabled: boolean
  exporting: 'csv' | 'xlsx' | null
  onExport: (format: 'csv' | 'xlsx') => void
}

export function LeadFinderExportButtons({ disabled, exporting, onExport }: ExportButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || exporting !== null}
        onClick={() => onExport('csv')}
      >
        {exporting === 'csv' ? 'Exporting CSV…' : 'Export CSV'}
      </Button>
      <Button
        type="button"
        disabled={disabled || exporting !== null}
        onClick={() => onExport('xlsx')}
      >
        {exporting === 'xlsx' ? 'Exporting Excel…' : 'Export Excel'}
      </Button>
    </div>
  )
}
