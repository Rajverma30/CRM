'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateLead, useUpdateLead, LeadWithAssignee } from '@/lib/queries/use-leads'
import { useEmployees } from '@/lib/queries/use-employees'
import { LeadStatus, LeadSource } from '@/lib/types/database'
import { capitalize } from '@/lib/utils'

const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'interested', 'proposal_sent', 'negotiation', 'won', 'lost']
const LEAD_SOURCES: LeadSource[] = ['google_maps', 'instagram', 'referral', 'website', 'whatsapp', 'cold_call', 'other']

interface LeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: LeadWithAssignee | null
}

export function LeadForm({ open, onOpenChange, lead }: LeadFormProps) {
  const isEdit = !!lead
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const { data: employees = [] } = useEmployees({ is_active: true })

  const [form, setForm] = useState({
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    industry: '',
    website: '',
    source: 'other' as string,
    interested_service: '',
    estimated_budget: '',
    notes: '',
    assigned_to: '',
    status: 'new' as string,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      if (lead) {
        setForm({
          business_name: lead.business_name,
          contact_person: lead.contact_person ?? '',
          phone: lead.phone ?? '',
          email: lead.email ?? '',
          industry: lead.industry ?? '',
          website: lead.website ?? '',
          source: lead.source,
          interested_service: lead.interested_service ?? '',
          estimated_budget: lead.estimated_budget?.toString() ?? '',
          notes: lead.notes ?? '',
          assigned_to: lead.assigned_to ?? '',
          status: lead.status,
        })
      } else {
        setForm({
          business_name: '',
          contact_person: '',
          phone: '',
          email: '',
          industry: '',
          website: '',
          source: 'other',
          interested_service: '',
          estimated_budget: '',
          notes: '',
          assigned_to: '',
          status: 'new',
        })
      }
      setError('')
    }
  }, [open, lead])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim()) {
      setError('Business name is required')
      return
    }
    setError('')

    const payload = {
      business_name: form.business_name.trim(),
      contact_person: form.contact_person.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      industry: form.industry.trim() || null,
      website: form.website.trim() || null,
      source: form.source as LeadSource,
      interested_service: form.interested_service.trim() || null,
      estimated_budget: form.estimated_budget ? Number(form.estimated_budget) : null,
      notes: form.notes.trim() || null,
      assigned_to: form.assigned_to || null,
      status: form.status as LeadStatus,
    }

    try {
      if (isEdit) {
        await updateLead.mutateAsync({ id: lead.id, ...payload })
      } else {
        await createLead.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // handled by mutation
    }
  }

  const isPending = createLead.isPending || updateLead.isPending
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input id="business_name" value={form.business_name} onChange={e => set('business_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={form.industry} onChange={e => set('industry', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => set('source', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map(s => (
                    <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interested_service">Interested Service</Label>
              <Input id="interested_service" value={form.interested_service} onChange={e => set('interested_service', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_budget">Estimated Budget</Label>
              <Input id="estimated_budget" type="number" value={form.estimated_budget} onChange={e => set('estimated_budget', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={form.assigned_to || '_none'} onValueChange={v => set('assigned_to', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Unassigned</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Save Changes' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
