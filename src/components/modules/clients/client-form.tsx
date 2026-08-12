'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateClient, useUpdateClient } from '@/lib/queries/use-clients'
import { Client } from '@/lib/types/database'

const EMPTY_FORM = {
  business_name: '',
  contact_person: '',
  phone: '',
  email: '',
  website_url: '',
  address: '',
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

  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    if (client) {
      setForm({
        business_name: client.business_name,
        contact_person: client.contact_person ?? '',
        phone: client.phone ?? '',
        email: client.email ?? '',
        website_url: client.website_url ?? '',
        address: client.address ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError('')
  }, [open, client?.id])

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
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      website_url: form.website_url.trim() || undefined,
      address: form.address.trim() || undefined,
      status: isEdit ? client.status : 'lead',
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                placeholder="https://"
                value={form.website_url}
                onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
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
