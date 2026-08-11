'use client'

import { use, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useClient, useClientServices, useUpdateClientServices, useServices, useDeleteClient } from '@/lib/queries/use-clients'
import { formatDate, formatCurrency, capitalize } from '@/lib/utils'
import { Client, Project, Task, Subscription, Payment, Proposal, ClientRequest, ActivityLog } from '@/lib/types/database'

import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, Column } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ClientForm } from '@/components/modules/clients/client-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

import {
  ArrowLeft, ExternalLink, Pencil, DollarSign, CreditCard, ListTodo,
  FolderKanban, Globe, Mail, Phone, MapPin, Building2, StickyNote,
  FileText, Inbox, Activity, Layers, Plus, CalendarDays, Clock, Trash2, User,
} from 'lucide-react'

function useClientProjects(clientId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['client-projects', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Project[]
    },
    enabled: !!clientId,
  })
}

function useClientTasks(clientId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['client-tasks', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assigned_to_fkey(full_name)')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Array<Task & { assignee: { full_name: string } | null }>
    },
    enabled: !!clientId,
  })
}

function useClientSubscriptions(clientId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['client-subscriptions', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, service:services(name)')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Array<Subscription & { service: { name: string } | null }>
    },
    enabled: !!clientId,
  })
}

function useClientPayments(clientId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId!)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: !!clientId,
  })
}

function useClientProposals(clientId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['client-proposals', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Proposal[]
    },
    enabled: !!clientId,
  })
}

function useClientRequests(clientId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['client-requests', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_requests')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ClientRequest[]
    },
    enabled: !!clientId,
  })
}

function useClientActivity(clientId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['client-activity', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, actor:profiles!activity_logs_actor_id_fkey(full_name)')
        .eq('entity_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as unknown as Array<ActivityLog & { actor: { full_name: string } | null }>
    },
    enabled: !!clientId,
  })
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const deleteClient = useDeleteClient()

  const { data: client, isLoading } = useClient(id)
  const { data: clientServices = [] } = useClientServices(id)
  const { data: projects = [] } = useClientProjects(id)
  const { data: tasks = [] } = useClientTasks(id)
  const { data: subscriptions = [] } = useClientSubscriptions(id)
  const { data: payments = [] } = useClientPayments(id)
  const { data: proposals = [] } = useClientProposals(id)
  const { data: requests = [] } = useClientRequests(id)
  const { data: activityLogs = [] } = useClientActivity(id)
  const { data: allServices = [] } = useServices()
  const updateServices = useUpdateClientServices()

  const serviceIds = useMemo(() => clientServices.map(cs => cs.service_id), [clientServices])

  const metrics = useMemo(() => {
    const mrr = subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.amount, 0)
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0)
    const pendingTasks = tasks.filter(t => t.status !== 'completed').length
    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planning').length
    return { mrr, totalPaid, pendingTasks, activeProjects }
  }, [subscriptions, payments, tasks, projects])

  if (isLoading) return <LoadingSpinner />
  if (!client) return <EmptyState icon={Building2} title="Client not found" description="This client doesn't exist or you don't have access." />

  const projectColumns: Column<Record<string, unknown>>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status as string} /> },
    { key: 'deadline', header: 'Deadline', render: r => r.deadline ? formatDate(r.deadline as string) : '—' },
    { key: 'budget', header: 'Budget', render: r => r.budget ? formatCurrency(r.budget as number) : '—' },
  ]

  const taskColumns: Column<Record<string, unknown>>[] = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status as string} /> },
    { key: 'priority', header: 'Priority', render: r => <StatusBadge status={r.priority as string} /> },
    { key: 'assignee', header: 'Assignee', render: r => { const a = r.assignee as { full_name: string } | null; return a?.full_name ?? '—' } },
    { key: 'due_date', header: 'Due Date', render: r => r.due_date ? formatDate(r.due_date as string) : '—' },
  ]

  const subscriptionColumns: Column<Record<string, unknown>>[] = [
    { key: 'service', header: 'Service', render: r => { const s = r.service as { name: string } | null; return s?.name ?? '—' } },
    { key: 'amount', header: 'Amount', render: r => formatCurrency(r.amount as number) },
    { key: 'billing_cycle', header: 'Cycle', render: r => capitalize(r.billing_cycle as string) },
    { key: 'next_billing_date', header: 'Next Billing', render: r => r.next_billing_date ? formatDate(r.next_billing_date as string) : '—' },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status as string} /> },
  ]

  const paymentColumns: Column<Record<string, unknown>>[] = [
    { key: 'payment_date', header: 'Date', sortable: true, render: r => formatDate(r.payment_date as string) },
    { key: 'amount', header: 'Amount', render: r => formatCurrency(r.amount as number) },
    { key: 'payment_method', header: 'Method', render: r => capitalize(r.payment_method as string) },
    { key: 'transaction_ref', header: 'Reference', render: r => (r.transaction_ref as string) ?? '—' },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status as string} /> },
  ]

  const proposalColumns: Column<Record<string, unknown>>[] = [
    { key: 'proposal_number', header: 'Number', sortable: true },
    { key: 'total', header: 'Total', render: r => formatCurrency(r.total as number) },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status as string} /> },
    { key: 'valid_until', header: 'Valid Until', render: r => r.valid_until ? formatDate(r.valid_until as string) : '—' },
  ]

  const requestColumns: Column<Record<string, unknown>>[] = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'priority', header: 'Priority', render: r => <StatusBadge status={r.priority as string} /> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status as string} /> },
    { key: 'created_at', header: 'Created', render: r => formatDate(r.created_at as string) },
  ]

  function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
    if (!value) return null
    return (
      <div className="flex items-start gap-3 text-sm">
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div>
          <span className="text-muted-foreground">{label}:</span>{' '}
          <span className="font-medium">{value}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.push('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{client.business_name}</h1>
              <StatusBadge status={client.status} />
            </div>
            {client.contact_person && (
              <p className="text-muted-foreground mt-1">
                {client.contact_person}
                {client.contact_position && (
                  <span className="text-muted-foreground/80"> · {client.contact_position}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {client.website_url && (
              <Button variant="outline" asChild>
                <a href={client.website_url.startsWith('http') ? client.website_url : `https://${client.website_url}`} target="_blank" rel="noopener noreferrer">
                  <Globe className="mr-2 h-4 w-4" /> Open Website
                </a>
              </Button>
            )}
            {isAdmin && (
              <>
                <Button onClick={() => setFormOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} title="MRR" value={formatCurrency(metrics.mrr)} />
        <StatCard icon={CreditCard} title="Total Paid" value={formatCurrency(metrics.totalPaid)} />
        <StatCard icon={ListTodo} title="Pending Tasks" value={metrics.pendingTasks} />
        <StatCard icon={FolderKanban} title="Active Projects" value={metrics.activeProjects} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Building2} label="Business" value={client.business_name} />
                <InfoRow icon={User} label="Contact" value={
                  client.contact_person
                    ? `${client.contact_person}${client.contact_position ? ` (${client.contact_position})` : ''}`
                    : null
                } />
                <InfoRow icon={Mail} label="Email" value={client.email} />
                <InfoRow icon={Phone} label="Phone" value={client.phone} />
                <InfoRow icon={MapPin} label="Address" value={client.address} />
                <InfoRow icon={Layers} label="Industry" value={client.industry} />
                <InfoRow icon={Globe} label="Website" value={client.website_url} />
                <InfoRow icon={CalendarDays} label="Created" value={formatDate(client.created_at)} />
                {client.notes && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3 text-sm">
                      <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1 whitespace-pre-wrap">{client.notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Active Services</CardTitle></CardHeader>
                <CardContent>
                  {clientServices.length ? (
                    <div className="flex flex-wrap gap-2">
                      {clientServices.map(cs => (
                        <Badge key={cs.id} variant="secondary">{cs.service.name}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No services assigned.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                <CardContent>
                  {activityLogs.length ? (
                    <div className="space-y-3">
                      {activityLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div>
                            <span className="font-medium">{log.actor?.full_name ?? 'System'}</span>{' '}
                            <span className="text-muted-foreground">{log.action}</span>
                            <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/projects?client_id=${id}`)}>
              <Plus className="mr-2 h-4 w-4" /> Add Project
            </Button>
          </div>
          <DataTable
            columns={projectColumns}
            data={projects as unknown as Record<string, unknown>[]}
            onRowClick={r => router.push(`/projects/${r.id}`)}
            emptyTitle="No projects"
            emptyDescription="No projects found for this client."
          />
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Services</CardTitle>
            </CardHeader>
            <CardContent>
              {allServices.length ? (
                <div className="space-y-3">
                  {allServices.map(svc => {
                    const isAssigned = serviceIds.includes(svc.id)
                    return (
                      <label key={svc.id} className="flex items-center gap-3 text-sm cursor-pointer">
                        <Checkbox
                          checked={isAssigned}
                          disabled={!isAdmin}
                          onCheckedChange={() => {
                            const next = isAssigned
                              ? serviceIds.filter(sid => sid !== svc.id)
                              : [...serviceIds, svc.id]
                            updateServices.mutate({ clientId: id, serviceIds: next })
                          }}
                        />
                        <span>{svc.name}</span>
                        {isAssigned && <Badge variant="outline" className="ml-auto">Active</Badge>}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No services available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <DataTable
            columns={taskColumns}
            data={tasks as unknown as Record<string, unknown>[]}
            emptyTitle="No tasks"
            emptyDescription="No tasks found for this client."
          />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/billing?client_id=${id}`)}>
              <Plus className="mr-2 h-4 w-4" /> Add Subscription
            </Button>
          </div>
          <DataTable
            columns={subscriptionColumns}
            data={subscriptions as unknown as Record<string, unknown>[]}
            emptyTitle="No subscriptions"
            emptyDescription="No active subscriptions for this client."
          />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/payments?client_id=${id}`)}>
              <Plus className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </div>
          <DataTable
            columns={paymentColumns}
            data={payments as unknown as Record<string, unknown>[]}
            emptyTitle="No payments"
            emptyDescription="No payment records for this client."
          />
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <DataTable
            columns={proposalColumns}
            data={proposals as unknown as Record<string, unknown>[]}
            emptyTitle="No proposals"
            emptyDescription="No proposals for this client."
          />
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/requests?client_id=${id}`)}>
              <Plus className="mr-2 h-4 w-4" /> New Request
            </Button>
          </div>
          <DataTable
            columns={requestColumns}
            data={requests as unknown as Record<string, unknown>[]}
            emptyTitle="No requests"
            emptyDescription="No requests from this client."
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
            <CardContent>
              {activityLogs.length ? (
                <div className="space-y-4">
                  {activityLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 text-sm border-l-2 border-muted pl-4">
                      <div>
                        <span className="font-medium">{log.actor?.full_name ?? 'System'}</span>{' '}
                        <span className="text-muted-foreground">{log.action}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Activity} title="No activity" description="No activity has been recorded for this client yet." />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        client={client}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Client"
        description="Are you sure you want to delete this client? All related data will be removed."
        confirmLabel="Delete"
        destructive
        loading={deleteClient.isPending}
        onConfirm={() => {
          deleteClient.mutate(id, {
            onSuccess: () => router.push('/clients'),
          })
        }}
      />
    </div>
  )
}
