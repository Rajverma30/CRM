'use client'

import { useState, useMemo } from 'react'
import { Plus, IndianRupee, TrendingUp, AlertTriangle, CreditCard, CalendarClock, Trash2, Pencil, MoreHorizontal } from 'lucide-react'
import { RequireAdmin } from '@/lib/auth/require-admin'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useSubscriptions, useDeleteSubscription, type SubscriptionWithJoins } from '@/lib/queries/use-subscriptions'
import { usePayments, useRevenueStats, useDeletePayment, type PaymentWithJoins } from '@/lib/queries/use-payments'
import { useClients } from '@/lib/queries/use-clients'
import { formatCurrency, formatDate, capitalize } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { SubscriptionForm } from '@/components/modules/billing/subscription-form'
import { PaymentForm } from '@/components/modules/billing/payment-form'
import { MarkPaidDialog } from '@/components/modules/billing/mark-paid-dialog'

function BillingContent() {
  const [tab, setTab] = useState('active')
  const [subFormOpen, setSubFormOpen] = useState(false)
  const [editSub, setEditSub] = useState<SubscriptionWithJoins | null>(null)
  const [payFormOpen, setPayFormOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<PaymentWithJoins | null>(null)
  const [markPaidSub, setMarkPaidSub] = useState<SubscriptionWithJoins | null>(null)
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)

  const deleteSubscription = useDeleteSubscription()
  const deletePayment = useDeletePayment()

  const [payStatusFilter, setPayStatusFilter] = useState('all')
  const [payClientFilter, setPayClientFilter] = useState('all')
  const [payDateFrom, setPayDateFrom] = useState('')
  const [payDateTo, setPayDateTo] = useState('')

  const { data: allSubs = [], isLoading: loadingSubs } = useSubscriptions()
  const { data: payments = [], isLoading: loadingPayments } = usePayments({
    status: payStatusFilter === 'all' ? undefined : payStatusFilter,
    client_id: payClientFilter === 'all' ? undefined : payClientFilter,
    date_from: payDateFrom || undefined,
    date_to: payDateTo || undefined,
  })
  const { data: stats, isLoading: loadingStats } = useRevenueStats()
  const { data: clients = [] } = useClients()

  const today = new Date().toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const activeSubs = useMemo(() => allSubs.filter(s => s.status === 'active'), [allSubs])
  const upcomingSubs = useMemo(
    () => activeSubs.filter(s => s.next_billing_date && s.next_billing_date >= today && s.next_billing_date <= in30Days)
      .sort((a, b) => (a.next_billing_date ?? '').localeCompare(b.next_billing_date ?? '')),
    [activeSubs, today, in30Days]
  )
  const overdueSubs = useMemo(
    () => activeSubs.filter(s => s.next_billing_date && s.next_billing_date < today),
    [activeSubs, today]
  )

  const subColumns: Column<SubscriptionWithJoins>[] = [
    { key: 'client', header: 'Client', sortable: true, render: r => r.client?.business_name ?? '—' },
    { key: 'service', header: 'Service', render: r => r.service?.name ?? '—' },
    { key: 'amount', header: 'Amount', sortable: true, render: r => formatCurrency(r.amount) },
    { key: 'billing_cycle', header: 'Cycle', render: r => capitalize(r.billing_cycle) },
    { key: 'next_billing_date', header: 'Next Billing', sortable: true, render: r => r.next_billing_date ? formatDate(r.next_billing_date) : '—' },
    { key: 'last_payment_date', header: 'Last Payment', render: r => r.last_payment_date ? formatDate(r.last_payment_date) : '—' },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      render: r => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {r.status === 'active' && (
            <Button size="sm" variant="outline" onClick={() => setMarkPaidSub(r)}>
              Mark Paid
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditSub(r); setSubFormOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteSubId(r.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const upcomingColumns: Column<SubscriptionWithJoins>[] = [
    { key: 'client', header: 'Client', render: r => r.client?.business_name ?? '—' },
    { key: 'service', header: 'Service', render: r => r.service?.name ?? '—' },
    { key: 'amount', header: 'Amount', render: r => formatCurrency(r.amount) },
    { key: 'next_billing_date', header: 'Due Date', sortable: true, render: r => r.next_billing_date ? formatDate(r.next_billing_date) : '—' },
    {
      key: 'days_until',
      header: 'Days Until Due',
      render: r => {
        if (!r.next_billing_date) return '—'
        const days = Math.ceil((new Date(r.next_billing_date).getTime() - Date.now()) / 86400000)
        return (
          <span className={cn(days <= 7 ? 'text-orange-600 font-medium' : '')}>
            {days} day{days !== 1 ? 's' : ''}
          </span>
        )
      },
    },
  ]

  const overdueColumns: Column<SubscriptionWithJoins>[] = [
    { key: 'client', header: 'Client', render: r => r.client?.business_name ?? '—' },
    { key: 'service', header: 'Service', render: r => r.service?.name ?? '—' },
    { key: 'amount', header: 'Amount', render: r => formatCurrency(r.amount) },
    { key: 'next_billing_date', header: 'Was Due', sortable: true, render: r => r.next_billing_date ? formatDate(r.next_billing_date) : '—' },
    {
      key: 'days_overdue',
      header: 'Days Overdue',
      render: r => {
        if (!r.next_billing_date) return '—'
        const days = Math.ceil((Date.now() - new Date(r.next_billing_date).getTime()) / 86400000)
        return <span className="text-destructive font-semibold">{days} day{days !== 1 ? 's' : ''}</span>
      },
    },
    {
      key: 'actions',
      header: '',
      render: r => (
        <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setMarkPaidSub(r) }}>
          Mark Paid
        </Button>
      ),
    },
  ]

  const paymentColumns: Column<PaymentWithJoins>[] = [
    { key: 'payment_date', header: 'Date', sortable: true, render: r => formatDate(r.payment_date) },
    { key: 'client', header: 'Client', render: r => r.client?.business_name ?? '—' },
    { key: 'amount', header: 'Amount', sortable: true, render: r => formatCurrency(r.amount) },
    { key: 'payment_method', header: 'Method', render: r => capitalize(r.payment_method) },
    { key: 'transaction_ref', header: 'Reference', render: r => r.transaction_ref || '—' },
    { key: 'invoice_number', header: 'Invoice #', render: r => r.invoice_number || '—' },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: r => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditPayment(r); setPayFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeletePaymentId(r.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Subscriptions" description="Manage subscriptions, payments, and revenue.">
        <Button onClick={() => { setEditSub(null); setSubFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Subscription
        </Button>
      </PageHeader>

      {loadingStats ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} title="MRR" value={formatCurrency(stats?.mrr ?? 0)} />
          <StatCard icon={IndianRupee} title="ARR" value={formatCurrency(stats?.arr ?? 0)} />
          <StatCard icon={AlertTriangle} title="Outstanding" value={formatCurrency(stats?.outstanding ?? 0)} className={stats?.outstanding ? 'border-destructive/30' : ''} />
          <StatCard icon={CreditCard} title="Collected (This Month)" value={formatCurrency(stats?.totalPaid ?? 0)} />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Active Subscriptions</TabsTrigger>
          <TabsTrigger value="all">All Subscriptions</TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingSubs.length > 0 && <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs">{upcomingSubs.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {overdueSubs.length > 0 && <span className="ml-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{overdueSubs.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {!loadingSubs && activeSubs.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No active subscriptions" description="Create your first subscription to start tracking billing." action={{ label: 'Add Subscription', onClick: () => { setEditSub(null); setSubFormOpen(true) } }} />
          ) : (
            <DataTable columns={subColumns} data={activeSubs as any[]} loading={loadingSubs} emptyTitle="No active subscriptions" emptyDescription="All subscriptions are inactive." />
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <DataTable columns={subColumns} data={allSubs as any[]} loading={loadingSubs} emptyTitle="No subscriptions" emptyDescription="Create your first subscription to get started." />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {!loadingSubs && upcomingSubs.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No upcoming billing" description="No subscriptions are due in the next 30 days." />
          ) : (
            <DataTable columns={upcomingColumns} data={upcomingSubs as any[]} loading={loadingSubs} emptyTitle="No upcoming billing" emptyDescription="No subscriptions due soon." />
          )}
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          {!loadingSubs && overdueSubs.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No overdue subscriptions" description="All payments are up to date." />
          ) : (
            <div className="space-y-4">
              {overdueSubs.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {overdueSubs.length} subscription{overdueSubs.length !== 1 ? 's are' : ' is'} overdue. Total outstanding: {formatCurrency(overdueSubs.reduce((s, o) => s + o.amount, 0))}
                </div>
              )}
              <DataTable columns={overdueColumns} data={overdueSubs as any[]} loading={loadingSubs} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <Select value={payStatusFilter} onValueChange={setPayStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={payClientFilter} onValueChange={setPayClientFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-[150px]" value={payDateFrom} onChange={e => setPayDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" className="w-[150px]" value={payDateTo} onChange={e => setPayDateTo(e.target.value)} placeholder="To" />
            <Button onClick={() => { setEditPayment(null); setPayFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </div>
          <DataTable columns={paymentColumns} data={payments as any[]} loading={loadingPayments} emptyTitle="No payments found" emptyDescription="Record your first payment or adjust filters." />
        </TabsContent>
      </Tabs>

      <SubscriptionForm open={subFormOpen} onOpenChange={setSubFormOpen} subscription={editSub} />
      <PaymentForm open={payFormOpen} onOpenChange={setPayFormOpen} payment={editPayment} />
      <MarkPaidDialog open={!!markPaidSub} onOpenChange={open => { if (!open) setMarkPaidSub(null) }} subscription={markPaidSub} />

      <ConfirmDialog
        open={!!deleteSubId}
        onOpenChange={() => setDeleteSubId(null)}
        title="Delete Subscription"
        description="Are you sure you want to delete this subscription? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteSubscription.isPending}
        onConfirm={() => {
          if (deleteSubId) {
            deleteSubscription.mutate(deleteSubId, { onSuccess: () => setDeleteSubId(null) })
          }
        }}
      />

      <ConfirmDialog
        open={!!deletePaymentId}
        onOpenChange={() => setDeletePaymentId(null)}
        title="Delete Payment"
        description="Are you sure you want to delete this payment record?"
        confirmLabel="Delete"
        destructive
        loading={deletePayment.isPending}
        onConfirm={() => {
          if (deletePaymentId) {
            deletePayment.mutate(deletePaymentId, { onSuccess: () => setDeletePaymentId(null) })
          }
        }}
      />
    </div>
  )
}

export default function BillingPage() {
  return (
    <RequireAdmin>
      <BillingContent />
    </RequireAdmin>
  )
}
