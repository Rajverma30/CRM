'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMarkSubscriptionPaid, type SubscriptionWithJoins } from '@/lib/queries/use-subscriptions'
import { PaymentMethod } from '@/lib/types/database'
import { formatCurrency, capitalize, formatDate } from '@/lib/utils'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other']

interface MarkPaidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: SubscriptionWithJoins | null
}

export function MarkPaidDialog({ open, onOpenChange, subscription }: MarkPaidDialogProps) {
  const markPaid = useMarkSubscriptionPaid()
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [transactionRef, setTransactionRef] = useState('')

  async function handleConfirm() {
    if (!subscription) return
    try {
      await markPaid.mutateAsync({
        subscriptionId: subscription.id,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_ref: transactionRef.trim() || undefined,
      })
      onOpenChange(false)
      setTransactionRef('')
    } catch {
      // handled by mutation
    }
  }

  if (!subscription) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>Record payment for this billing cycle.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{subscription.client?.business_name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">{subscription.service?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{formatCurrency(subscription.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Period</span>
              <span className="font-medium">
                {subscription.last_payment_date ? formatDate(subscription.last_payment_date) : formatDate(subscription.start_date)}
                {' → '}
                {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : '—'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m} value={m}>{capitalize(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transaction Reference (optional)</Label>
            <Input value={transactionRef} onChange={e => setTransactionRef(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={markPaid.isPending}>Cancel</Button>
          <Button onClick={handleConfirm} loading={markPaid.isPending}>Confirm Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
