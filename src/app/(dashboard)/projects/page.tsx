'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useProjects, useDeleteProject, ProjectWithClient } from '@/lib/queries/use-projects'
import { ProjectStatus } from '@/lib/types/database'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Users, Trash2, Pencil, MoreHorizontal } from 'lucide-react'
import { formatDate, formatCurrency, capitalize } from '@/lib/utils'
import { ProjectForm } from '@/components/modules/projects/project-form'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const PROJECT_STATUSES: ProjectStatus[] = [
  'planning', 'in_progress', 'testing', 'waiting_for_client', 'completed', 'on_hold', 'cancelled',
]

export default function ProjectsPage() {
  const router = useRouter()
  const { isAdmin, profile } = useAuth()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithClient | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleteProject = useDeleteProject()

  const supabase = createClient()
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, business_name')
        .eq('tenant_id', profile!.tenant_id)
        .order('business_name')
      if (error) throw error
      return data
    },
    enabled: !!profile?.tenant_id,
  })

  const filters = useMemo(() => {
    const f: { status?: ProjectStatus; client_id?: string } = {}
    if (statusFilter !== 'all') f.status = statusFilter as ProjectStatus
    if (clientFilter !== 'all') f.client_id = clientFilter
    return f
  }, [statusFilter, clientFilter])

  const { data: projects = [], isLoading } = useProjects(filters)

  const columns: Column<ProjectWithClient>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
      render: (row) => row.clients?.business_name ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'start_date',
      header: 'Start Date',
      sortable: true,
      render: (row) => row.start_date ? formatDate(row.start_date) : '—',
    },
    {
      key: 'deadline',
      header: 'Deadline',
      sortable: true,
      render: (row) => row.deadline ? formatDate(row.deadline) : '—',
    },
    {
      key: 'budget',
      header: 'Budget',
      sortable: true,
      render: (row) => row.budget != null ? formatCurrency(row.budget) : '—',
    },
    {
      key: 'member_count',
      header: 'Members',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.member_count ?? 0}</span>
        </div>
      ),
    },
    ...(isAdmin ? [{
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row: ProjectWithClient) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => { setEditingProject(row); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    } satisfies Column<ProjectWithClient>] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Manage your projects">
        {isAdmin && (
          <Button onClick={() => { setEditingProject(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PROJECT_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={projects as any[]}
        loading={isLoading}
        searchKey="name"
        searchPlaceholder="Search projects..."
        onRowClick={(row) => router.push(`/projects/${(row as unknown as ProjectWithClient).id}`)}
        emptyTitle="No projects found"
        emptyDescription="Get started by creating your first project."
      />

      <ProjectForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingProject(null)
        }}
        project={editingProject}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Project"
        description="Are you sure you want to delete this project? All related tasks will also be removed."
        confirmLabel="Delete"
        destructive
        loading={deleteProject.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteProject.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
          }
        }}
      />
    </div>
  )
}
