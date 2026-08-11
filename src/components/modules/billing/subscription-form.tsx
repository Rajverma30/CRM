'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/lib/queries/use-clients'
import { useServices } from '@/lib/queries/use-clients'
import { useCreateSubscription, useUpdateSubscription, getNextBillingDate } from '@/lib/queries/use-subscriptions'
import { type SubscriptionWithJoins } from '@/lib/queries/use-subscriptions'
import { BillingCycle, SubscriptionStatus } from '@/lib/types/database'
import { capitalize } from '@/lib/utils'

const BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time']
const STATUSES: SubscriptionStatus[] = ['active', 'paused', 'cancelled', 'completed']

interface SubscriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription?: SubscriptionWithJoins | null
}

export function SubscriptionForm({ open, onOpenChange, subscription }: SubscriptionFormProps) {
  const isEdit = !!subscription
  const createSub = useCreateSubscription()
  const updateSub = useUpdateSubscription()
  const { data: clients = [] } = useClients()
  const { data: services = [] } = useServices()

  const [form, setForm] = useState({
    client_id: '',
    service_id: '',
    amount: '',
    billing_cycle: 'monthly' as BillingCycle,
    start_date: new Date().toISOString().split('T')[0],
    next_billing_date: '',
    status: 'active' as string,
    notes: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      if (subscription) {
        setForm({
          client_id: subscription.client_id,
          service_id: subscription.service_id ?? '',
          amount: String(subscription.amount),
          billing_cycle: subscription.billing_cycle,
          start_date: subscription.start_date,
          next_billing_date: subscription.next_billing_date ?? '',
          status: subscription.status,
          notes: subscription.notes ?? '',
        })
      } else {
        const today = new Date().toISOString().split('T')[0]
        setForm({
          client_id: '',
          service_id: '',
          amount: '',
          billing_cycle: 'monthly',
          start_date: today,
          next_billing_date: getNextBillingDate(today, 'monthly'),
          status: 'active',
          notes: '',
        })
      }
      setError('')
    }
  }, [open, subscription])

  useEffect(() => {
    if (!isEdit && form.start_date && form.billing_cycle) {
      setForm(f => ({ ...f, next_billing_date: getNextBillingDate(f.start_date, f.billing_cycle) }))
    }
  }, [form.start_date, form.billing_cycle, isEdit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.amount || !form.start_date) {
      setError('Client, amount, and start date are required')
      return
    }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be a positive number')
      return
    }
    setError('')

    const payload = {
      client_id: form.client_id,
      service_id: form.service_id || null,
      amount: amt,
      billing_cycle: form.billing_cycle,
      start_date: form.start_date,
      next_billing_date: form.next_billing_date || null,
      status: form.status,
      notes: form.notes.trim() || null,
    }

    try {
      if (isEdit) {
        await updateSub.mutateAsync({ id: subscription.id, ...payload })
      } else {
        await createSub.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // handled by mutation
    }
  }

  const isPending = createSub.isPending || updateSub.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Subscription' : 'Add Subscription'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update subscription details.' : 'Create a new billing subscription.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={form.service_id} onValueChange={v => setForm(f => ({ ...f, service_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount (INR) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select value={form.billing_cycle} onValueChange={v => setForm(f => ({ ...f, billing_cycle: v as BillingCycle }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map(c => (
                    <SelectItem key={c} value={c}>{capitalize(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Next Billing Date</Label>
              <Input
                type="date"
                value={form.next_billing_date}
                onChange={e => setForm(f => ({ ...f, next_billing_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" loading={isPending}>{isEdit ? 'Save Changes' : 'Create Subscription'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
