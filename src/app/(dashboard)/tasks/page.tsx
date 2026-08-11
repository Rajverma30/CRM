'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useTasks, useDeleteTask, TaskWithRelations } from '@/lib/queries/use-tasks'
import { useEmployees } from '@/lib/queries/use-employees'
import { useProjects } from '@/lib/queries/use-projects'
import { TaskPriority, TaskStatus } from '@/lib/types/database'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import { getInitials, formatDate, capitalize } from '@/lib/utils'
import { TaskForm } from '@/components/modules/tasks/task-form'
import { TaskStatusSelect } from '@/components/modules/tasks/task-status-select'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

function isOverdue(task: TaskWithRelations) {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date) < new Date(new Date().toDateString())
}

type QuickFilter = 'all' | 'my' | 'overdue' | 'due_today' | 'completed'

export default function TasksPage() {
  const router = useRouter()
  const { profile, isAdmin } = useAuth()
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(isAdmin ? 'all' : 'my')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filters = useMemo(() => {
    const f: { status?: TaskStatus; priority?: TaskPriority; assigned_to?: string; client_id?: string; project_id?: string; overdue?: boolean } = {}
    if (statusFilter !== 'all') f.status = statusFilter as TaskStatus
    if (priorityFilter !== 'all') f.priority = priorityFilter as TaskPriority
    if (assigneeFilter !== 'all') f.assigned_to = assigneeFilter
    if (clientFilter !== 'all') f.client_id = clientFilter
    if (projectFilter !== 'all') f.project_id = projectFilter
    if (quickFilter === 'overdue') f.overdue = true
    if (quickFilter === 'completed') f.status = 'completed'
    if (quickFilter === 'my' && profile?.id) f.assigned_to = profile.id
    if (!isAdmin && profile?.id) f.assigned_to = profile.id
    return f
  }, [statusFilter, priorityFilter, assigneeFilter, clientFilter, projectFilter, quickFilter, profile?.id, isAdmin])

  const { data: tasks = [], isLoading } = useTasks(filters)
  const { data: employees = [] } = useEmployees({ is_active: true })
  const { data: projects = [] } = useProjects()
  const deleteTask = useDeleteTask()

  const displayTasks = useMemo(() => {
    if (quickFilter === 'due_today') {
      const today = new Date().toISOString().split('T')[0]
      return tasks.filter((t) => t.due_date === today)
    }
    return tasks
  }, [tasks, quickFilter])

  const clients = useMemo(() => {
    const map = new Map<string, string>()
    tasks.forEach((t) => {
      if (t.clients) map.set(t.clients.id, t.clients.business_name)
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [tasks])

  const columns: Column<TaskWithRelations>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <span className="font-medium">{row.title}</span>
      ),
    },
    ...(isAdmin ? [{
      key: 'client',
      header: 'Client',
      render: (row: TaskWithRelations) => row.clients?.business_name ?? '—',
    }, {
      key: 'project',
      header: 'Project',
      render: (row: TaskWithRelations) => row.projects?.name ?? '—',
    }, {
      key: 'assignee',
      header: 'Assignee',
      render: (row: TaskWithRelations) =>
        row.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={row.assignee.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">{getInitials(row.assignee.full_name)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.assignee.full_name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    }] : []),
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (row) => (
        <Badge className={PRIORITY_COLORS[row.priority]} variant="outline">
          {capitalize(row.priority)}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <TaskStatusSelect
            taskId={row.id}
            currentStatus={row.status}
            assignedTo={row.assigned_to}
          />
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      render: (row) => {
        if (!row.due_date) return '—'
        const overdue = isOverdue(row)
        return (
          <span className={overdue ? 'text-red-600 font-medium' : ''}>
            {formatDate(row.due_date)}
            {overdue && ' (Overdue)'}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => router.push(`/tasks/${row.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Tasks' : 'My Tasks'}
        description={isAdmin ? 'Manage and track tasks' : 'Your assigned tasks'}
      >
        <Button onClick={() => { setEditingTask(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> {isAdmin ? 'New Task' : 'Create Task'}
        </Button>
      </PageHeader>

      <Tabs value={quickFilter} onValueChange={(v) => setQuickFilter(v as QuickFilter)}>
        <TabsList>
          {isAdmin && <TabsTrigger value="all">All</TabsTrigger>}
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="due_today">Due Today</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {isAdmin && (
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assigned To" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {clients.length > 0 && (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {projects.length > 0 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      )}

      <DataTable
        columns={columns}
        data={displayTasks as any[]}
        loading={isLoading}
        searchKey="title"
        searchPlaceholder="Search tasks..."
        onRowClick={(row) => router.push(`/tasks/${(row as unknown as TaskWithRelations).id}`)}
        emptyTitle="No tasks found"
        emptyDescription="Get started by creating your first task."
      />

      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={editingTask} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteTask.isPending}
        onConfirm={() => {
          if (deleteId) deleteTask.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
        }}
      />
    </div>
  )
}
