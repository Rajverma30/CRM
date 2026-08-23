'use client'

import { Button } from '@/components/ui/button'

interface ExportButtonsProps {
  disabled: boolean
  exporting: 'csv' | 'xlsx' | null
  saving: boolean
  onExport: (format: 'csv' | 'xlsx') => void
  onSave: () => void
}

export function LeadFinderExportButtons({
  disabled,
  exporting,
  saving,
  onExport,
  onSave,
}: ExportButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || exporting !== null || saving}
        onClick={() => onExport('csv')}
      >
        {exporting === 'csv' ? 'Exporting CSV…' : 'Export CSV'}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || exporting !== null || saving}
        onClick={() => onExport('xlsx')}
      >
        {exporting === 'xlsx' ? 'Exporting Excel…' : 'Export Excel'}
      </Button>
      <Button
        type="button"
        disabled={disabled || exporting !== null || saving}
        onClick={onSave}
      >
        {saving ? 'Saving to Leads…' : 'Save to CRM Leads'}
      </Button>
    </div>
  )
}
