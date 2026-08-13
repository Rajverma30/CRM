'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Eye, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/auth-context'
import { useClients, useDeleteClient } from '@/lib/queries/use-clients'
import { Client, ClientStatus } from '@/lib/types/database'
import { formatDate } from '@/lib/utils'
import { ClientForm } from '@/components/modules/clients/client-form'
import { Search, MoreHorizontal } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All', value: 'all' },
  { label: 'Lead', value: 'lead' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Completed', value: 'completed' },
  { label: 'Lost', value: 'lost' },
]

export default function ClientsPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: clients = [], isLoading } = useClients({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  })

  const deleteClient = useDeleteClient()

  const columns: Column<Client>[] = [
    { key: 'business_name', header: 'Business Name', sortable: true },
    {
      key: 'contact_person',
      header: 'Contact',
      sortable: true,
      render: (row) => (
        <div>
          <span>{row.contact_person ?? '—'}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'industry', header: 'Industry', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row) => formatDate(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => router.push(`/clients/${row.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => { setEditClient(row); setFormOpen(true) }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your clients and their information.">
        {isAdmin && (
          <Button onClick={() => { setEditClient(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Client
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isLoading && clients.length === 0 && !search && statusFilter === 'all' ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to get started."
          action={isAdmin ? { label: 'Add Client', onClick: () => setFormOpen(true) } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={clients as any[]}
          loading={isLoading}
          onRowClick={(row) => router.push(`/clients/${(row as unknown as Client).id}`)}
          emptyTitle="No clients found"
          emptyDescription="Try adjusting your search or filters."
        />
      )}

      <ClientForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditClient(null)
        }}
        client={editClient}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteClient.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteClient.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
          }
        }}
      />
    </div>
  )
}
