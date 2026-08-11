'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useTenant, useUpdateTenant, useSettingsServices, useCreateService, useUpdateService, useDeleteService } from '@/lib/queries/use-settings'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { isAdmin } = useAuth()

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Admin access required.</p></div>

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage company settings and services" />
      <CompanySettingsForm />
      <Separator />
      <ServicesSection />
    </div>
  )
}

function CompanySettingsForm() {
  const { data: tenant, isLoading } = useTenant()
  const updateTenant = useUpdateTenant()

  const [form, setForm] = useState({
    name: '',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    currency: 'INR',
    proposal_terms: '',
    invoice_terms: '',
  })

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        logo_url: tenant.logo_url || '',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        website: tenant.website || '',
        currency: tenant.currency || 'INR',
        proposal_terms: tenant.proposal_terms || '',
        invoice_terms: tenant.invoice_terms || '',
      })
    }
  }, [tenant])

  if (isLoading) return <LoadingSpinner />

  const handleSave = () => {
    updateTenant.mutate({
      name: form.name,
      logo_url: form.logo_url || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      currency: form.currency,
      proposal_terms: form.proposal_terms || null,
      invoice_terms: form.invoice_terms || null,
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Company Settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Company Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
          <div><Label>Default Currency</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
        </div>
        <div><Label>Address</Label><Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
        <div><Label>Default Proposal Terms</Label><Textarea value={form.proposal_terms} onChange={e => setForm(f => ({ ...f, proposal_terms: e.target.value }))} rows={3} /></div>
        <div><Label>Default Invoice Terms</Label><Textarea value={form.invoice_terms} onChange={e => setForm(f => ({ ...f, invoice_terms: e.target.value }))} rows={3} /></div>
        <Button onClick={handleSave} disabled={updateTenant.isPending}>
          {updateTenant.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  )
}

function ServicesSection() {
  const { data: services, isLoading } = useSettingsServices()
  const createService = useCreateService()
  const updateService = useUpdateService()
  const deleteService = useDeleteService()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  if (isLoading) return <LoadingSpinner />

  const handleAdd = () => {
    if (!newName.trim()) return
    createService.mutate(newName.trim(), { onSuccess: () => setNewName('') })
  }

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return
    updateService.mutate({ id, name: editName.trim() }, { onSuccess: () => setEditingId(null) })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Services</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="New service name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <Button onClick={handleAdd} disabled={createService.isPending}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
        <div className="space-y-2">
          {services?.map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 border rounded-md">
              {editingId === s.id ? (
                <div className="flex gap-2 flex-1">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdate(s.id)} />
                  <Button size="sm" onClick={() => handleUpdate(s.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{s.name}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(s.id); setEditName(s.name) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteService.mutate(s.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {!services?.length && <p className="text-sm text-muted-foreground">No services yet</p>}
        </div>
      </CardContent>
    </Card>
  )
}
