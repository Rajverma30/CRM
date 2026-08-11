'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from 'sonner'

export interface Notification {
  id: string
  tenant_id: string
  profile_id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  created_at: string
}

export function useNotifications() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!profile?.id,
  })
}

export function useUnreadCount() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['notifications', 'unread-count', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile!.id)
        .eq('read', false)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('profile_id', profile!.id)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface CreateNotificationData {
  tenant_id: string
  profile_id: string
  title: string
  message: string
  type: string
  link?: string | null
}

export function useCreateNotification() {
  const supabase = createClient()

  return useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(data as any)
        .select()
        .single()
      if (error) throw error
      return notification as Notification
    },
  })
}
