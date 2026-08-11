'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Eye, Pencil, Copy, MoreHorizontal, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/auth-context'
import { useProposals, useDeleteProposal, type ProposalWithRelations } from '@/lib/queries/use-proposals'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Viewed', value: 'viewed' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Expired', value: 'expired' },
]

export default function ProposalsPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: proposals = [], isLoading } = useProposals({
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const deleteProposal = useDeleteProposal()

  if (!isAdmin) {
    return <EmptyState icon={FileText} title="Access Denied" description="Only admins can view proposals." />
  }

  function handleDuplicate(proposal: ProposalWithRelations) {
    const params = new URLSearchParams({ duplicate: proposal.id })
    router.push(`/proposals/new?${params}`)
  }

  const columns: Column<ProposalWithRelations>[] = [
    { key: 'proposal_number', header: 'Proposal #', sortable: true },
    {
      key: 'client',
      header: 'Client / Lead',
      render: (row) => row.client?.business_name || row.lead?.business_name || '—',
    },
    {
      key: 'total',
      header: 'Total (INR)',
      sortable: true,
      render: (row) => formatCurrency(row.total),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'valid_until',
      header: 'Valid Until',
      sortable: true,
      render: (row) => row.valid_until ? formatDate(row.valid_until) : '—',
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
            <DropdownMenuItem onClick={() => router.push(`/proposals/${row.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/proposals/new?edit=${row.id}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(row)}>
              <Copy className="mr-2 h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Proposals" description="Create and manage client proposals.">
        <Button onClick={() => router.push('/proposals/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Proposal
        </Button>
      </PageHeader>

      <div className="flex gap-3">
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

      {!isLoading && proposals.length === 0 && statusFilter === 'all' ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Create your first proposal to get started."
          action={{ label: 'New Proposal', onClick: () => router.push('/proposals/new') }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={proposals as any[]}
          loading={isLoading}
          onRowClick={(row) => router.push(`/proposals/${(row as unknown as ProposalWithRelations).id}`)}
          emptyTitle="No proposals found"
          emptyDescription="Try adjusting your filters."
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Proposal"
        description="Are you sure you want to delete this proposal? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteProposal.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteProposal.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
          }
        }}
      />
    </div>
  )
}
