'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LayoutGrid, Table2, MoreHorizontal, Eye, Pencil, Trash2, Target, Upload, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, Column } from '@/components/shared/data-table'
import { KanbanBoard, KanbanColumn } from '@/components/shared/kanban-board'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/auth-context'
import { useLeads, useUpdateLead, useDeleteLead, LeadWithAssignee } from '@/lib/queries/use-leads'
import { useEmployees } from '@/lib/queries/use-employees'
import { LeadStatus, LeadSource } from '@/lib/types/database'
import { formatDate, formatCurrency, capitalize, getInitials } from '@/lib/utils'
import { LeadForm } from '@/components/modules/leads/lead-form'
import { LeadImportDialog } from '@/components/modules/leads/lead-import-dialog'
import { WhatsAppOutreachDialog, WhatsAppDialogLead } from '@/components/modules/leads/whatsapp-outreach-dialog'
import { BulkWhatsAppDialog } from '@/components/modules/leads/bulk-whatsapp-dialog'
import { getLeadSubcategories, LEAD_CATEGORIES, LEAD_CATEGORY_OPTIONS } from '@/lib/constants/lead-categories'

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'new', title: 'New', color: '#3b82f6' },
  { id: 'contacted', title: 'Contacted', color: '#8b5cf6' },
  { id: 'interested', title: 'Interested', color: '#f59e0b' },
  { id: 'proposal_sent', title: 'Proposal Sent', color: '#6366f1' },
  { id: 'negotiation', title: 'Negotiation', color: '#ec4899' },
  { id: 'won', title: 'Won', color: '#22c55e' },
  { id: 'lost', title: 'Lost', color: '#ef4444' },
]

const STATUS_OPTIONS: LeadStatus[] = ['new', 'contacted', 'interested', 'proposal_sent', 'negotiation', 'won', 'lost']
const SOURCE_OPTIONS: LeadSource[] = ['google_maps', 'instagram', 'referral', 'website', 'whatsapp', 'cold_call', 'other']

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  disabled = false,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
}) {
  function toggle(value: string) {
    onChange(selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled} className="w-[190px] justify-between font-normal">
          <span className="truncate">
            {selected.length ? `${label}: ${selected.length} selected` : `All ${label}s`}
          </span>
          <span className="ml-2 text-muted-foreground">▾</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-2">
        <div className="mb-2 flex items-center justify-between border-b pb-2">
          <span className="text-sm font-medium">Select {label}</span>
          {selected.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange([])}>
              Clear
            </Button>
          )}
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {options.map(option => (
            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-muted">
              <Checkbox checked={selected.includes(option)} onCheckedChange={() => toggle(option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function LeadsPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [subcategoryFilter, setSubcategoryFilter] = useState<string[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editLead, setEditLead] = useState<LeadWithAssignee | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [whatsappLead, setWhatsappLead] = useState<WhatsAppDialogLead | null>(null)
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false)
  const [bulkWhatsappOpen, setBulkWhatsappOpen] = useState(false)

  const { data: leads = [], isLoading } = useLeads({
    status: statusFilter === 'all' ? undefined : statusFilter as LeadStatus,
    source: sourceFilter === 'all' ? undefined : sourceFilter as LeadSource,
    assigned_to: assignedFilter === 'all' ? undefined : assignedFilter,
    category: categoryFilter.length ? categoryFilter : undefined,
    subcategory: subcategoryFilter.length ? subcategoryFilter : undefined,
  })
  const { data: employees = [] } = useEmployees({ is_active: true })
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
  const subcategories = [...new Set(categoryFilter.flatMap(category => getLeadSubcategories(category)))]

  function handleKanbanMove(itemId: string, newStatus: string) {
    updateLead.mutate({ id: itemId, status: newStatus as LeadStatus })
  }

  const columns: Column<LeadWithAssignee>[] = [
    { key: 'business_name', header: 'Business Name', sortable: true },
    { key: 'contact_person', header: 'Contact Person', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (row) => <Badge variant="outline">{capitalize(row.source)}</Badge>,
    },
    {
      key: 'estimated_budget',
      header: 'Budget',
      sortable: true,
      render: (row) => row.estimated_budget ? formatCurrency(row.estimated_budget) : '—',
    },
    {
      key: 'assigned_to',
      header: 'Assigned',
      render: (row) => row.assignee?.full_name ?? '—',
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
      className: 'w-16',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          {row.phone && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              title="Send WhatsApp Message"
              onClick={() => {
                setWhatsappLead(row)
                setWhatsappDialogOpen(true)
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/leads/${row.id}`)}>
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              {row.phone && (
                <DropdownMenuItem
                  onClick={() => {
                    setWhatsappLead(row)
                    setWhatsappDialogOpen(true)
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4 text-[#25D366]" /> Send WhatsApp
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setEditLead(row); setFormOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  if (!isAdmin) {
    return (
      <EmptyState
        icon={Target}
        title="Access Denied"
        description="Only admins can access the leads pipeline."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Leads Pipeline" description="Manage and track your sales leads.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
            onClick={() => setBulkWhatsappOpen(true)}
            title="Bulk WhatsApp outreach to leads"
          >
            <MessageSquare className="mr-2 h-4 w-4 text-[#25D366]" /> Bulk WhatsApp
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Excel
          </Button>
          <Button onClick={() => { setEditLead(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {SOURCE_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assigned To" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MultiSelectFilter
            label="Category"
            options={LEAD_CATEGORY_OPTIONS}
            selected={categoryFilter}
            onChange={values => {
              setCategoryFilter(values)
              setSubcategoryFilter(current => current.filter(subcategory =>
                values.some(category => (LEAD_CATEGORIES[category as keyof typeof LEAD_CATEGORIES] as readonly string[]).includes(subcategory))
              ))
            }}
          />
          <MultiSelectFilter
            label="Subcategory"
            options={subcategories}
            selected={subcategoryFilter}
            onChange={setSubcategoryFilter}
            disabled={!subcategories.length}
          />
        </div>

        <Tabs value={view} onValueChange={v => setView(v as 'kanban' | 'table')}>
          <TabsList>
            <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1" /> Kanban</TabsTrigger>
            <TabsTrigger value="table"><Table2 className="h-4 w-4 mr-1" /> Table</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No leads yet"
          description="Create your first lead to start building your pipeline."
          action={{ label: 'Add Lead', onClick: () => setFormOpen(true) }}
        />
      ) : view === 'kanban' ? (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          items={leads}
          onMove={handleKanbanMove}
          renderCard={(lead) => (
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/leads/${lead.id}`)}
            >
              <CardContent className="p-3 space-y-2">
                <p className="font-medium text-sm leading-tight">{lead.business_name}</p>
                {lead.contact_person && (
                  <p className="text-xs text-muted-foreground">{lead.contact_person}</p>
                )}
                <div className="flex items-center justify-between">
                  {lead.estimated_budget ? (
                    <span className="text-xs font-medium text-green-600">
                      {formatCurrency(lead.estimated_budget)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-1">
                    {lead.phone && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Send WhatsApp Message"
                        onClick={(e) => {
                          e.stopPropagation()
                          setWhatsappLead(lead)
                          setWhatsappDialogOpen(true)
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {capitalize(lead.source)}
                    </Badge>
                  </div>
                </div>
                {lead.assignee && (
                  <div className="flex items-center gap-1.5 pt-1 border-t">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={lead.assignee.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">{getInitials(lead.assignee.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{lead.assignee.full_name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          data={leads as any[]}
          loading={isLoading}
          searchKey="business_name"
          searchPlaceholder="Search leads..."
          onRowClick={(row) => router.push(`/leads/${(row as unknown as LeadWithAssignee).id}`)}
          emptyTitle="No leads found"
          emptyDescription="Try adjusting your filters."
        />
      )}

      <LeadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={editLead}
      />

      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteLead.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteLead.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
          }
        }}
      />

      <WhatsAppOutreachDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        lead={whatsappLead}
      />

      <BulkWhatsAppDialog
        open={bulkWhatsappOpen}
        onOpenChange={setBulkWhatsappOpen}
        leads={leads}
      />
    </div>
  )
}
