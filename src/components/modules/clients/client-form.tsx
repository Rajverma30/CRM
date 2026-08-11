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
import { CONTACT_POSITIONS } from '@/lib/constants/contact-positions'

const CLIENT_STATUSES: ClientStatus[] = ['lead', 'active', 'inactive', 'completed', 'lost']

const EMPTY_FORM = {
  business_name: '',
  contact_person: '',
  contact_position: '',
  phone: '',
  email: '',
  address: '',
  industry: '',
  website_url: '',
  notes: '',
  status: 'lead' as string,
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
        contact_person: client.contact_person ?? '',
        contact_position: client.contact_position ?? '',
        phone: client.phone ?? '',
        email: client.email ?? '',
        address: client.address ?? '',
        industry: client.industry ?? '',
        website_url: client.website_url ?? '',
        notes: client.notes ?? '',
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
    setSelectedServiceIds(clientServices.map((cs) => cs.service_id))
    servicesLoadedFor.current = client.id
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
      contact_person: form.contact_person.trim() || undefined,
      contact_position: form.contact_position || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      industry: form.industry.trim() || undefined,
      website_url: form.website_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update client information.' : 'Add a new client to your CRM.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={form.business_name}
                onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={form.contact_person}
                onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_position">Position / Role</Label>
              <Select
                value={form.contact_position || 'none'}
                onValueChange={v => setForm(f => ({ ...f, contact_position: v === 'none' ? '' : v }))}
              >
                <SelectTrigger id="contact_position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {CONTACT_POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                value={form.website_url}
                onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Services</Label>
            {loadingServices ? (
              <LoadingSpinner />
            ) : services?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-md border p-3">
                {services.map(svc => (
                  <label key={svc.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedServiceIds.includes(svc.id)}
                      onCheckedChange={() => toggleService(svc.id)}
                    />
                    {svc.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No services available. Add services in Settings first.</p>
            )}
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
