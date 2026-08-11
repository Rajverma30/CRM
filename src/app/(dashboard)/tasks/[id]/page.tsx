'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useTask, useDeleteTask, useTaskComments, useAddTaskComment } from '@/lib/queries/use-tasks'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Pencil, Trash2, MessageSquare, Clock, AlertTriangle, Activity } from 'lucide-react'
import { getInitials, formatDate, capitalize, cn } from '@/lib/utils'
import { TaskForm } from '@/components/modules/tasks/task-form'
import { TaskStatusSelect } from '@/components/modules/tasks/task-status-select'
import Link from 'next/link'

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === 'completed') return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { data: task, isLoading } = useTask(id)
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(id)
  const addComment = useAddTaskComment()
  const deleteTask = useDeleteTask()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [commentText, setCommentText] = useState('')

  if (isLoading) return <LoadingSpinner />
  if (!task) return <EmptyState title="Task not found" description="This task does not exist." icon={AlertTriangle} />

  const overdue = isOverdue(task.due_date, task.status)

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    await addComment.mutateAsync({ taskId: id, content: commentText.trim() })
    setCommentText('')
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <Badge className={PRIORITY_COLORS[task.priority]} variant="outline">
              {capitalize(task.priority)}
            </Badge>
            <TaskStatusSelect taskId={task.id} currentStatus={task.status} assignedTo={task.assigned_to} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          {isAdmin && (
            <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Info section */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            {task.clients ? (
              <Link href={`/clients/${task.clients.id}`} className="font-medium text-primary hover:underline">
                {task.clients.business_name}
              </Link>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Project</p>
            {task.projects ? (
              <Link href={`/projects/${task.projects.id}`} className="font-medium text-primary hover:underline">
                {task.projects.name}
              </Link>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Assignee</p>
            {task.assignee ? (
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={task.assignee.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{getInitials(task.assignee.full_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{task.assignee.full_name}</span>
              </div>
            ) : (
              <p className="font-medium">Unassigned</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created By</p>
            <p className="font-medium">{task.creator?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Due Date</p>
            <p className={cn('font-medium', overdue && 'text-red-600')}>
              {task.due_date ? formatDate(task.due_date) : '—'}
              {overdue && (
                <span className="ml-1 inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Overdue
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created At</p>
            <p className="font-medium">{formatDate(task.created_at)}</p>
          </div>
          {task.completed_at && (
            <div>
              <p className="text-sm text-muted-foreground">Completed At</p>
              <p className="font-medium">{formatDate(task.completed_at)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {task.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{task.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {commentsLoading ? (
            <LoadingSpinner />
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No comments yet. Be the first to comment.</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.profiles.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(comment.profiles.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.profiles.full_name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Textarea
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={handleAddComment} disabled={!commentText.trim() || addComment.isPending}>
                {addComment.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Activity}
            title="No activity logged"
            description="Activity tracking will be available soon."
          />
        </CardContent>
      </Card>

      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={task} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteTask.isPending}
        onConfirm={() => {
          deleteTask.mutate(id, {
            onSuccess: () => {
              setDeleteOpen(false)
              router.push('/tasks')
            },
          })
        }}
      />
    </div>
  )
}
