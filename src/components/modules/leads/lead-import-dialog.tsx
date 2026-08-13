'use client'

import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface LeadImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadImportDialog({ open, onOpenChange }: LeadImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setFile(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleImport() {
    if (!file) {
      setError('Pehle Excel file choose karo')
      return
    }
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Import failed')
      }

      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success(`${json.imported} leads Excel se add ho gayi`)
      if (json.usedFallback) {
        toast.message('Extra columns notes mein save hue — SQL migration run karo for full fields')
      }
      handleOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Excel Leads</DialogTitle>
          <DialogDescription>
            Apni Google Maps / leads Excel upload karo. Saari rows leads mein add ho jayengi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Expected columns:</p>
            <p>
              Business Name, Rating, Reviews, Category, Phone, Website, Address,
              Google Maps, Place ID, Latitude, Longitude, Lead Score
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => {
              setFile(e.target.files?.[0] ?? null)
              setError('')
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-lg border border-dashed p-6 text-center hover:bg-muted/50 transition-colors"
          >
            <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Click to choose .xlsx / .xls / .csv</p>
            )}
          </button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} loading={loading} disabled={!file}>
            <Upload className="mr-2 h-4 w-4" /> Import Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
