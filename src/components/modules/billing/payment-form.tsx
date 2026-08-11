'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/lib/queries/use-clients'
import { useSubscriptions, type SubscriptionWithJoins } from '@/lib/queries/use-subscriptions'
import { useCreatePayment, useUpdatePayment, type PaymentWithJoins } from '@/lib/queries/use-payments'
import { PaymentMethod, PaymentStatus } from '@/lib/types/database'
import { capitalize, formatCurrency } from '@/lib/utils'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other']
const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'pending', 'failed', 'refunded']

interface PaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: PaymentWithJoins | null
}

export function PaymentForm({ open, onOpenChange, payment }: PaymentFormProps) {
  const isEdit = !!payment
  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()
  const { data: clients = [] } = useClients()

  const [form, setForm] = useState({
    client_id: '',
    subscription_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer' as PaymentMethod,
    transaction_ref: '',
    invoice_number: '',
    notes: '',
    status: 'paid' as string,
  })
  const [error, setError] = useState('')

  const { data: clientSubs = [] } = useSubscriptions(
    form.client_id ? { client_id: form.client_id } : undefined
  )

  useEffect(() => {
    if (open) {
      if (payment) {
        setForm({
          client_id: payment.client_id,
          subscription_id: payment.subscription_id ?? '',
          amount: String(payment.amount),
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          transaction_ref: payment.transaction_ref ?? '',
          invoice_number: payment.invoice_number ?? '',
          notes: payment.notes ?? '',
          status: payment.status,
        })
      } else {
        setForm({
          client_id: '',
          subscription_id: '',
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bank_transfer',
          transaction_ref: '',
          invoice_number: '',
          notes: '',
          status: 'paid',
        })
      }
      setError('')
    }
  }, [open, payment])

  useEffect(() => {
    if (form.subscription_id && clientSubs.length) {
      const sub = clientSubs.find(s => s.id === form.subscription_id)
      if (sub) setForm(f => ({ ...f, amount: String(sub.amount) }))
    }
  }, [form.subscription_id, clientSubs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.amount || !form.payment_date) {
      setError('Client, amount, and payment date are required')
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
      subscription_id: form.subscription_id || null,
      amount: amt,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      transaction_ref: form.transaction_ref.trim() || null,
      invoice_number: form.invoice_number.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    }

    try {
      if (isEdit) {
        await updatePayment.mutateAsync({ id: payment.id, ...payload })
      } else {
        await createPayment.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // handled by mutation
    }
  }

  const isPending = createPayment.isPending || updatePayment.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update payment details.' : 'Record a new payment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v, subscription_id: '' }))}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.client_id && (
            <div className="space-y-2">
              <Label>Subscription</Label>
              <Select value={form.subscription_id} onValueChange={v => setForm(f => ({ ...f, subscription_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subscription (optional)" /></SelectTrigger>
                <SelectContent>
                  {clientSubs.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.service?.name ?? 'No service'} — {formatCurrency(s.amount)} / {capitalize(s.billing_cycle)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v as PaymentMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{capitalize(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transaction / Reference ID</Label>
              <Input
                value={form.transaction_ref}
                onChange={e => setForm(f => ({ ...f, transaction_ref: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                value={form.invoice_number}
                onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
              />
            </div>
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
            <Button type="submit" loading={isPending}>{isEdit ? 'Save Changes' : 'Record Payment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
