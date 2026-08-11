'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { ClientRequest, RequestStatus, TaskPriority } from '@/lib/types/database'
import { toast } from 'sonner'

export interface ClientRequestWithClient extends ClientRequest {
  clients: { id: string; business_name: string } | null
  creator: { id: string; full_name: string } | null
}

interface ClientRequestFilters {
  status?: RequestStatus
  client_id?: string
  priority?: TaskPriority
}

const REQUEST_SELECT = `
  *,
  clients(id, business_name),
  creator:profiles!client_requests_created_by_fkey(id, full_name)
`

export function useClientRequests(filters?: ClientRequestFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['client-requests', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('client_requests')
        .select(REQUEST_SELECT)
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status as any)
      if (filters?.client_id) query = query.eq('client_id', filters.client_id)
      if (filters?.priority) query = query.eq('priority', filters.priority as any)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as ClientRequestWithClient[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useClientRequest(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['client-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_requests')
        .select(REQUEST_SELECT)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as ClientRequestWithClient
    },
    enabled: !!id,
  })
}

interface CreateClientRequestData {
  client_id: string
  title: string
  description?: string | null
  priority?: TaskPriority
  status?: RequestStatus
}

export function useCreateClientRequest() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateClientRequestData) => {
      const { data: request, error } = await supabase
        .from('client_requests')
        .insert({
          ...data,
          tenant_id: profile!.tenant_id,
          created_by: profile!.id,
        })
        .select()
        .single()
      if (error) throw error
      return request as ClientRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-requests'] })
      toast.success('Request created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateClientRequestData {
  id: string
  title?: string
  description?: string | null
  priority?: TaskPriority
  status?: RequestStatus
  client_id?: string
}

export function useUpdateClientRequest() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateClientRequestData) => {
      const { data: request, error } = await supabase
        .from('client_requests')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return request as ClientRequest
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-requests'] })
      queryClient.invalidateQueries({ queryKey: ['client-request', data.id] })
      toast.success('Request updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface ConvertRequestData {
  requestId: string
  project_id?: string | null
  assigned_to?: string | null
  priority?: TaskPriority
  due_date?: string | null
}

export function useConvertRequestToTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ requestId, project_id, assigned_to, priority, due_date }: ConvertRequestData) => {
      const { data: request, error: reqError } = await supabase
        .from('client_requests')
        .select('*')
        .eq('id', requestId)
        .single()
      if (reqError) throw reqError

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          tenant_id: profile!.tenant_id,
          client_id: request.client_id,
          project_id: project_id || null,
          assigned_to: assigned_to || null,
          created_by: profile!.id,
          title: request.title,
          description: request.description,
          priority: priority || request.priority,
          status: 'pending' as any,
          due_date: due_date || null,
        })
        .select()
        .single()
      if (taskError) throw taskError

      const { error: updateError } = await supabase
        .from('client_requests')
        .update({ converted_task_id: task.id, status: 'converted' as any })
        .eq('id', requestId)
      if (updateError) throw updateError

      return { task, request }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-requests'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Request converted to task successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
