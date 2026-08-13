'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useProject, useDeleteProject, useUpdateProjectMembers } from '@/lib/queries/use-projects'
import { useEmployees } from '@/lib/queries/use-employees'
import { ProjectWithClient } from '@/lib/queries/use-projects'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { StatCard } from '@/components/shared/stat-card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { ProjectForm } from '@/components/modules/projects/project-form'
import { DataTable, Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ArrowLeft, ExternalLink, Pencil, Trash2,
  IndianRupee, CalendarClock, ListChecks, CheckCircle2,
  FolderOpen, UserPlus, Clock, Activity,
} from 'lucide-react'
import { formatDate, formatCurrency, getInitials, capitalize } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Task } from '@/lib/types/database'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { data: project, isLoading, error } = useProject(id)
  const deleteProject = useDeleteProject()
  const updateMembers = useUpdateProjectMembers()

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [manageMembersOpen, setManageMembersOpen] = useState(false)

  const supabase = createClient()

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, profiles:assigned_to(full_name)')
        .eq('project_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as (Task & { profiles: { full_name: string } | null })[]
    },
    enabled: !!id,
  })

  if (isLoading) return <LoadingSpinner />
  if (error || !project) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Project not found"
        description="The project you're looking for doesn't exist or you don't have access."
        action={{ label: 'Back to Projects', onClick: () => router.push('/projects') }}
      />
    )
  }

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id)
    router.push('/projects')
  }

  const daysRemaining = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length

  const projectForForm: ProjectWithClient = {
    ...project,
    clients: project.clients,
    member_count: project.project_members?.length ?? 0,
  }

  const taskColumns: Column<Task & { profiles: { full_name: string } | null }>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: 'assigned_to',
      header: 'Assignee',
      render: (row) => row.profiles?.full_name ?? 'Unassigned',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <StatusBadge status={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      render: (row) => row.due_date ? formatDate(row.due_date) : '—',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.clients && (
            <p className="text-sm text-muted-foreground">
              Client:{' '}
              <button
                className="text-primary hover:underline"
                onClick={() => router.push(`/clients/${project.clients!.id}`)}
              >
                {project.clients.business_name}
              </button>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {project.website_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={project.website_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" /> Open Website
              </a>
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                <Pencil className="mr-1 h-4 w-4" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={IndianRupee}
          title="Budget"
          value={project.budget != null ? formatCurrency(project.budget) : '—'}
        />
        <StatCard
          icon={CalendarClock}
          title="Days Remaining"
          value={daysRemaining != null ? (daysRemaining > 0 ? daysRemaining : 'Overdue') : '—'}
        />
        <StatCard icon={ListChecks} title="Total Tasks" value={totalTasks} />
        <StatCard icon={CheckCircle2} title="Completed Tasks" value={completedTasks} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Project Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {project.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{project.description}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="mt-1"><StatusBadge status={project.status} /></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Budget</p>
                    <p className="text-sm mt-1">{project.budget != null ? formatCurrency(project.budget) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                    <p className="text-sm mt-1">{project.start_date ? formatDate(project.start_date) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Deadline</p>
                    <p className="text-sm mt-1">{project.deadline ? formatDate(project.deadline) : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
              <CardContent>
                {project.project_members?.length ? (
                  <div className="space-y-3">
                    {project.project_members.map(m => (
                      <div key={m.profile_id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.profiles.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">{getInitials(m.profiles.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{m.profiles.full_name}</p>
                          <p className="text-xs text-muted-foreground">{capitalize(m.profiles.role)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No team members assigned</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent tasks summary */}
          {tasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recent Tasks</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={t.status} />
                        <span className="text-sm">{t.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t.due_date ? formatDate(t.due_date) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => router.push(`/tasks?project_id=${project.id}`)}>
              <ListChecks className="mr-1 h-4 w-4" /> Add Task
            </Button>
          </div>
          <DataTable
            columns={taskColumns}
            data={tasks as any[]}
            searchKey="title"
            searchPlaceholder="Search tasks..."
            emptyTitle="No tasks yet"
            emptyDescription="Create a task for this project to get started."
          />
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setManageMembersOpen(true)}>
                <UserPlus className="mr-1 h-4 w-4" /> Manage Members
              </Button>
            </div>
          )}
          {project.project_members?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.project_members.map(m => (
                <Card key={m.profile_id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.profiles.avatar_url ?? undefined} />
                      <AvatarFallback>{getInitials(m.profiles.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{m.profiles.full_name}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">{capitalize(m.profiles.role)}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UserPlus}
              title="No members assigned"
              description="Add team members to this project."
            />
          )}
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <ActivityPlaceholder icon={Activity} text="Project created" date={project.created_at} />
                {project.start_date && (
                  <ActivityPlaceholder icon={Clock} text="Project started" date={project.start_date} />
                )}
                {project.status === 'completed' && (
                  <ActivityPlaceholder icon={CheckCircle2} text="Project completed" date={project.updated_at} />
                )}
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Full activity log coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ProjectForm open={formOpen} onOpenChange={setFormOpen} project={projectForForm} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteProject.isPending}
        onConfirm={handleDelete}
      />

      <ManageMembersDialog
        open={manageMembersOpen}
        onOpenChange={setManageMembersOpen}
        projectId={project.id}
        currentMemberIds={project.project_members?.map(m => m.profile_id) ?? []}
      />
    </div>
  )
}

function ActivityPlaceholder({ icon: Icon, text, date }: { icon: React.ComponentType<{ className?: string }>; text: string; date: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-full bg-muted p-2 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{text}</p>
        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
      </div>
    </div>
  )
}

function ManageMembersDialog({
  open,
  onOpenChange,
  projectId,
  currentMemberIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  currentMemberIds: string[]
}) {
  const { data: employees = [] } = useEmployees({ is_active: true })
  const updateMembers = useUpdateProjectMembers()
  const [selected, setSelected] = useState<string[]>(currentMemberIds)

  // Sync when dialog opens
  const [lastIds, setLastIds] = useState(currentMemberIds)
  if (open && currentMemberIds !== lastIds) {
    setSelected(currentMemberIds)
    setLastIds(currentMemberIds)
  }

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  const handleSave = async () => {
    await updateMembers.mutateAsync({ projectId, memberIds: selected })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Manage Members</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-60 border rounded-md p-3">
          <div className="space-y-2">
            {employees.map(emp => (
              <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selected.includes(emp.id)}
                  onCheckedChange={() => toggle(emp.id)}
                />
                <span className="text-sm">{emp.full_name}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMembers.isPending}>
            {updateMembers.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
