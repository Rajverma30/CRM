'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Task, TaskComment, TaskPriority, TaskStatus } from '@/lib/types/database'
import { toast } from 'sonner'

// ----- Extended types -----

export interface TaskWithRelations extends Task {
  clients: { id: string; business_name: string } | null
  projects: { id: string; name: string } | null
  assignee: { id: string; full_name: string; avatar_url: string | null } | null
  creator: { id: string; full_name: string } | null
}

export interface TaskCommentWithAuthor extends TaskComment {
  profiles: { id: string; full_name: string; avatar_url: string | null }
}

// ----- Filters -----

interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  client_id?: string
  project_id?: string
  overdue?: boolean
}

const TASK_SELECT = `
  *,
  clients(id, business_name),
  projects(id, name),
  assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
  creator:profiles!tasks_created_by_fkey(id, full_name)
`

// ----- Queries -----

export function useTasks(filters?: TaskFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['tasks', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.priority) query = query.eq('priority', filters.priority)
      if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
      if (filters?.client_id) query = query.eq('client_id', filters.client_id)
      if (filters?.project_id) query = query.eq('project_id', filters.project_id)
      if (filters?.overdue) {
        const today = new Date().toISOString().split('T')[0]
        query = query.lt('due_date', today).neq('status', 'completed')
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as TaskWithRelations[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useTask(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as TaskWithRelations
    },
    enabled: !!id,
  })
}

export function useMyTasks() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['tasks', 'mine', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('assigned_to', profile!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as TaskWithRelations[]
    },
    enabled: !!profile?.id,
  })
}

// ----- Mutations -----

interface CreateTaskData {
  title: string
  description?: string | null
  client_id?: string | null
  project_id?: string | null
  assigned_to?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  due_date?: string | null
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          ...data,
          tenant_id: profile!.tenant_id,
          created_by: profile!.id,
        })
        .select()
        .single()
      if (error) throw error
      return task as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateTaskData {
  id: string
  title?: string
  description?: string | null
  client_id?: string | null
  project_id?: string | null
  assigned_to?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  due_date?: string | null
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTaskData) => {
      const updateData: Record<string, unknown> = { ...data }
      if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
      const { data: task, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return task as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', data.id] })
      toast.success('Task updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const updateData: Record<string, unknown> = { status }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', data.id] })
      toast.success('Status updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ----- Comments -----

export function useTaskComments(taskId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as TaskCommentWithAuthor[]
    },
    enabled: !!taskId,
  })
}

export function useAddTaskComment() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({ task_id: taskId, author_id: profile!.id, content })
        .select()
        .single()
      if (error) throw error
      return data as TaskComment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] })
      toast.success('Comment added')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
