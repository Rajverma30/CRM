'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from 'sonner'

export interface ActivityLog {
  id: string
  tenant_id: string
  actor_id: string
  entity_type: string
  entity_id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ActivityLogWithActor extends ActivityLog {
  profiles: { id: string; full_name: string; avatar_url: string | null }
}

interface ActivityLogFilters {
  entity_type?: string
  entity_id?: string
  actor_id?: string
  date_from?: string
  date_to?: string
}

export function useActivityLogs(filters?: ActivityLogFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['activity-logs', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filters?.entity_type) query = query.eq('entity_type', filters.entity_type)
      if (filters?.entity_id) query = query.eq('entity_id', filters.entity_id)
      if (filters?.actor_id) query = query.eq('actor_id', filters.actor_id)
      if (filters?.date_from) query = query.gte('created_at', filters.date_from)
      if (filters?.date_to) query = query.lte('created_at', filters.date_to)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as ActivityLogWithActor[]
    },
    enabled: !!profile?.tenant_id,
  })
}

interface CreateActivityLogData {
  entity_type: string
  entity_id: string
  action: string
  metadata?: Record<string, unknown> | null
}

export function useCreateActivityLog() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateActivityLogData) => {
      const { data: log, error } = await supabase
        .from('activity_logs')
        .insert({
          ...data,
          tenant_id: profile!.tenant_id,
          actor_id: profile!.id,
        } as any)
        .select()
        .single()
      if (error) throw error
      return log as ActivityLog
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useEntityActivity(entityType: string, entityId: string | undefined) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['activity-logs', 'entity', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('tenant_id', profile!.tenant_id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as unknown as ActivityLogWithActor[]
    },
    enabled: !!profile?.tenant_id && !!entityId,
  })
}
