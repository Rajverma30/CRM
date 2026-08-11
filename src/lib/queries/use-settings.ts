'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Tenant, Service } from '@/lib/types/database'
import { toast } from 'sonner'

export function useTenant() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['tenant', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile!.tenant_id)
        .single()
      if (error) throw error
      return data as Tenant
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (data: Partial<Tenant>) => {
      const { data: updated, error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', profile!.tenant_id)
        .select()
        .single()
      if (error) throw error
      return updated as Tenant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] })
      toast.success('Settings saved successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useSettingsServices() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['settings-services', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', profile!.tenant_id)
        .order('name')
      if (error) throw error
      return data as Service[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('services')
        .insert({ tenant_id: profile!.tenant_id, name })
        .select()
        .single()
      if (error) throw error
      return data as Service
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-services'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success('Service created')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('services').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-services'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success('Service updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-services'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success('Service deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
