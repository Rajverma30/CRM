'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Eye, Pencil, ArrowRightLeft, Inbox } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/auth-context'
import { useClients } from '@/lib/queries/use-clients'
import { useClientRequests, ClientRequestWithClient } from '@/lib/queries/use-client-requests'
import { RequestStatus, TaskPriority } from '@/lib/types/database'
import { formatDate, capitalize } from '@/lib/utils'
import { RequestForm } from '@/components/modules/requests/request-form'
import { ConvertToTaskDialog } from '@/components/modules/requests/convert-to-task-dialog'

const STATUS_OPTIONS: RequestStatus[] = ['new', 'reviewing', 'approved', 'converted', 'completed', 'rejected']
const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export default function ClientRequestsPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editRequest, setEditRequest] = useState<ClientRequestWithClient | null>(null)
  const [convertRequest, setConvertRequest] = useState<ClientRequestWithClient | null>(null)

  const { data: clients = [] } = useClients()
  const { data: requests = [], isLoading } = useClientRequests({
    status: statusFilter === 'all' ? undefined : statusFilter as RequestStatus,
    client_id: clientFilter === 'all' ? undefined : clientFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter as TaskPriority,
  })

  const columns: Column<ClientRequestWithClient>[] = [
    { key: 'title', header: 'Title', sortable: true },
    {
      key: 'client_id',
      header: 'Client',
      render: (row) => row.clients?.business_name ?? '—',
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className={PRIORITY_COLORS[row.priority]}>
          {capitalize(row.priority)}
        </Badge>
      ),
    },
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
            <DropdownMenuItem onClick={() => { setEditRequest(row); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {row.status === 'approved' && (
              <DropdownMenuItem onClick={() => setConvertRequest(row)}>
                <ArrowRightLeft className="mr-2 h-4 w-4" /> Convert to Task
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Client Requests" description="Manage requests from your clients.">
        <Button onClick={() => { setEditRequest(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> New Request
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITY_OPTIONS.map(p => (
              <SelectItem key={p} value={p}>{capitalize(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isLoading && requests.length === 0 && statusFilter === 'all' && clientFilter === 'all' && priorityFilter === 'all' ? (
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          description="Create a new request to get started."
          action={{ label: 'New Request', onClick: () => setFormOpen(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={requests as any[]}
          loading={isLoading}
          searchKey="title"
          searchPlaceholder="Search requests..."
          emptyTitle="No requests found"
          emptyDescription="Try adjusting your filters."
        />
      )}

      <RequestForm
        open={formOpen}
        onOpenChange={setFormOpen}
        request={editRequest}
      />

      {convertRequest && (
        <ConvertToTaskDialog
          open={!!convertRequest}
          onOpenChange={() => setConvertRequest(null)}
          request={convertRequest}
        />
      )}
    </div>
  )
}
