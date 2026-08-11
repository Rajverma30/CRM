'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Lead, LeadStatus, LeadSource } from '@/lib/types/database'
import { toast } from 'sonner'

export interface LeadWithAssignee extends Lead {
  assignee: { id: string; full_name: string; avatar_url: string | null } | null
}

interface LeadFilters {
  status?: LeadStatus
  source?: LeadSource
  assigned_to?: string
}

const LEAD_SELECT = `
  *,
  assignee:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)
`

export function useLeads(filters?: LeadFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['leads', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(LEAD_SELECT)
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.source) query = query.eq('source', filters.source)
      if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as LeadWithAssignee[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useLead(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(LEAD_SELECT)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as LeadWithAssignee
    },
    enabled: !!id,
  })
}

interface CreateLeadData {
  business_name: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  industry?: string | null
  website?: string | null
  source?: LeadSource
  interested_service?: string | null
  estimated_budget?: number | null
  notes?: string | null
  assigned_to?: string | null
  status?: LeadStatus
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateLeadData) => {
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({ ...data, tenant_id: profile!.tenant_id })
        .select()
        .single()
      if (error) throw error
      return lead as Lead
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateLeadData {
  id: string
  business_name?: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  industry?: string | null
  website?: string | null
  source?: LeadSource
  interested_service?: string | null
  estimated_budget?: number | null
  notes?: string | null
  assigned_to?: string | null
  status?: LeadStatus
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateLeadData) => {
      const { data: lead, error } = await supabase
        .from('leads')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return lead as Lead
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', data.id] })
      toast.success('Lead updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface ConvertLeadData {
  leadId: string
  createProject?: boolean
  projectName?: string
  projectDescription?: string
}

export function useConvertLeadToClient() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ leadId, createProject, projectName, projectDescription }: ConvertLeadData) => {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()
      if (leadError) throw leadError

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          tenant_id: profile!.tenant_id,
          business_name: lead.business_name,
          contact_person: lead.contact_person,
          phone: lead.phone,
          email: lead.email,
          industry: lead.industry,
          website_url: lead.website,
          notes: lead.notes,
          status: 'active',
        })
        .select()
        .single()
      if (clientError) throw clientError

      let project = null
      if (createProject && projectName) {
        const { data: proj, error: projError } = await supabase
          .from('projects')
          .insert({
            tenant_id: profile!.tenant_id,
            client_id: client.id,
            name: projectName,
            description: projectDescription || null,
            status: 'planning',
          })
          .select()
          .single()
        if (projError) throw projError
        project = proj
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: 'won' })
        .eq('id', leadId)
      if (updateError) throw updateError

      return { client, project }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Lead converted to client successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
