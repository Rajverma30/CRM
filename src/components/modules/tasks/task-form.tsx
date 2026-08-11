'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/lib/auth/auth-context'
import { useCreateTask, useUpdateTask, TaskWithRelations } from '@/lib/queries/use-tasks'
import { useEmployees } from '@/lib/queries/use-employees'
import { useProjects } from '@/lib/queries/use-projects'
import { TaskPriority, TaskStatus } from '@/lib/types/database'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: TaskWithRelations | null
}

interface FormData {
  title: string
  description: string
  client_id: string
  project_id: string
  assigned_to: string
  priority: TaskPriority
  status: TaskStatus
  due_date: string
}

function useClients() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['clients-list', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, business_name')
        .eq('tenant_id', profile!.tenant_id)
        .order('business_name')
      if (error) throw error
      return data as { id: string; business_name: string }[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function TaskForm({ open, onOpenChange, task }: TaskFormProps) {
  const isEdit = !!task
  const { profile, isAdmin } = useAuth()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const { data: employees = [] } = useEmployees({ is_active: true })
  const { data: clients = [] } = useClients()
  const isSubmitting = createTask.isPending || updateTask.isPending

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      client_id: '',
      project_id: '',
      assigned_to: '',
      priority: 'medium',
      status: 'pending',
      due_date: '',
    },
  })

  const selectedClientId = watch('client_id')
  const { data: allProjects = [] } = useProjects(
    selectedClientId ? { client_id: selectedClientId } : undefined
  )
  const filteredProjects = useMemo(() => {
    if (!selectedClientId) return allProjects
    return allProjects.filter((p) => p.client_id === selectedClientId)
  }, [allProjects, selectedClientId])

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        client_id: task.client_id ?? '',
        project_id: task.project_id ?? '',
        assigned_to: task.assigned_to ?? '',
        priority: task.priority,
        status: task.status,
        due_date: task.due_date ?? '',
      })
    } else {
      reset({
        title: '',
        description: '',
        client_id: '',
        project_id: '',
        assigned_to: profile?.id ?? '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
      })
    }
  }, [task, reset, profile?.id])

  useEffect(() => {
    if (!isEdit) {
      setValue('project_id', '')
    }
  }, [selectedClientId, isEdit, setValue])

  const onSubmit = async (data: FormData) => {
    const payload = {
      title: data.title,
      description: data.description || null,
      client_id: data.client_id || null,
      project_id: data.project_id || null,
      assigned_to: data.assigned_to || null,
      priority: data.priority,
      status: data.status,
      due_date: data.due_date || null,
    }

    if (isEdit) {
      await updateTask.mutateAsync({ id: task!.id, ...payload })
    } else {
      await createTask.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const priority = watch('priority')
  const status = watch('status')
  const assignedTo = watch('assigned_to')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClientId} onValueChange={(v) => setValue('client_id', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={watch('project_id')} onValueChange={(v) => setValue('project_id', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isAdmin && (
            <input type="hidden" {...register('assigned_to')} value={profile?.id ?? ''} />
          )}

          {isAdmin && (
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={assignedTo} onValueChange={(v) => setValue('assigned_to', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setValue('priority', v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" {...register('due_date')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
