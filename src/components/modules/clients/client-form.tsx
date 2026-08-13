'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateClient, useUpdateClient, useServices, useClientServices } from '@/lib/queries/use-clients'
import { Client, ClientStatus } from '@/lib/types/database'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

const CLIENT_STATUSES: ClientStatus[] = ['lead', 'active', 'inactive', 'completed', 'lost']

const EMPTY_FORM = {
  business_name: '',
  phone: '',
  phone_2: '',
  address: '',
  status: 'active' as string,
}

interface ClientFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
}

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const isEdit = !!client
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const { data: services, isLoading: loadingServices } = useServices()
  const { data: clientServices } = useClientServices(open && client ? client.id : undefined)

  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const servicesLoadedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      servicesLoadedFor.current = null
      return
    }

    if (client) {
      setForm({
        business_name: client.business_name,
        phone: client.phone ?? '',
        phone_2: client.phone_2 ?? '',
        address: client.address ?? '',
        status: client.status,
      })
    } else {
      setForm(EMPTY_FORM)
      setSelectedServiceIds([])
    }
    setError('')
  }, [open, client?.id])

  useEffect(() => {
    if (!open || !client || !clientServices) return
    if (servicesLoadedFor.current === client.id) return
    servicesLoadedFor.current = client.id
    setSelectedServiceIds(clientServices.map(cs => cs.service_id))
  }, [open, client?.id, clientServices])

  function toggleService(serviceId: string) {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim()) {
      setError('Business name is required')
      return
    }
    setError('')

    const payload = {
      business_name: form.business_name.trim(),
      phone: form.phone.trim() || undefined,
      phone_2: form.phone_2.trim() || undefined,
      address: form.address.trim() || undefined,
      status: form.status,
      service_ids: selectedServiceIds,
    }

    try {
      if (isEdit) {
        await updateClient.mutateAsync({ id: client.id, ...payload })
      } else {
        await createClient.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // error handled by mutation
    }
  }

  const isPending = createClient.isPending || updateClient.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update client information.' : 'Add a new client to your CRM.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              value={form.business_name}
              onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Service Needed</Label>
            {loadingServices ? (
              <LoadingSpinner size={20} className="py-2" />
            ) : services?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border p-3">
                {services.map(service => (
                  <label key={service.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No services configured yet.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_2">Second Phone (optional)</Label>
              <Input
                id="phone_2"
                value={form.phone_2}
                onChange={e => setForm(f => ({ ...f, phone_2: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Save Changes' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
