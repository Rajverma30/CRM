'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Client, Service } from '@/lib/types/database'
import { toast } from 'sonner'

interface ClientFilters {
  status?: string
  search?: string
}

export function useClients(filters?: ClientFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['clients', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status as any)
      }
      if (filters?.search) {
        query = query.or(
          `business_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,contact_position.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data as Client[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useClient(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Client
    },
    enabled: !!id,
  })
}

export function useClientServices(clientId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['client-services', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('*, service:services(*)')
        .eq('client_id', clientId!)
      if (error) throw error
      return data as unknown as Array<{ id: string; client_id: string; service_id: string; service: Service }>
    },
    enabled: !!clientId,
  })
}

export function useServices() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['services', profile?.tenant_id],
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

interface CreateClientData {
  business_name: string
  contact_person?: string
  contact_position?: string
  phone?: string
  phone_2?: string
  email?: string
  address?: string
  industry?: string
  website_url?: string
  notes?: string
  status?: string
  service_ids?: string[]
}

export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClientData) => {
      // Use API route (service role) to avoid broken RLS recursion on project_members
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create client')
      return json as Client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateClientData {
  id: string
  business_name?: string
  contact_person?: string | null
  contact_position?: string | null
  phone?: string | null
  phone_2?: string | null
  email?: string | null
  address?: string | null
  industry?: string | null
  website_url?: string | null
  notes?: string | null
  status?: string
  service_ids?: string[]
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, service_ids, ...data }: UpdateClientData) => {
      const { phone_2, ...rest } = data
      let updated: Client | null = null
      let error: { message: string } | null = null

      if (phone_2 !== undefined) {
        const first = await supabase
          .from('clients')
          .update({ ...rest, phone_2 } as any)
          .eq('id', id)
          .select()
          .single()
        updated = first.data as Client | null
        error = first.error
        if (error && /phone_2/i.test(error.message)) {
          const fallback = await supabase
            .from('clients')
            .update(rest as any)
            .eq('id', id)
            .select()
            .single()
          updated = fallback.data as Client | null
          error = fallback.error
        }
      } else {
        const result = await supabase
          .from('clients')
          .update(rest as any)
          .eq('id', id)
          .select()
          .single()
        updated = result.data as Client | null
        error = result.error
      }

      if (error) throw error
      if (!updated) throw new Error('Failed to update client')

      if (service_ids !== undefined) {
        await supabase.from('client_services').delete().eq('client_id', id)
        if (service_ids.length) {
          const { error: svcError } = await supabase
            .from('client_services')
            .insert(service_ids.map(sid => ({ client_id: id, service_id: sid })))
          if (svcError) throw svcError
        }
      }

      return updated as Client
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', data.id] })
      queryClient.invalidateQueries({ queryKey: ['client-services', data.id] })
      toast.success('Client updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateClientServices() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ clientId, serviceIds }: { clientId: string; serviceIds: string[] }) => {
      await supabase.from('client_services').delete().eq('client_id', clientId)
      if (serviceIds.length) {
        const { error } = await supabase
          .from('client_services')
          .insert(serviceIds.map(sid => ({ client_id: clientId, service_id: sid })))
        if (error) throw error
      }
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-services', clientId] })
      toast.success('Services updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
