'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Proposal, ProposalItem } from '@/lib/types/database'
import { toast } from 'sonner'

interface ProposalFilters {
  status?: string
  client_id?: string
}

export type ProposalWithRelations = Proposal & {
  client: { id: string; business_name: string } | null
  lead: { id: string; business_name: string } | null
}

export type ProposalDetail = Proposal & {
  client: { id: string; business_name: string; contact_person: string | null; email: string | null; phone: string | null; address: string | null } | null
  lead: { id: string; business_name: string; contact_person: string | null; email: string | null; phone: string | null } | null
  proposal_items: ProposalItem[]
}

export function useProposals(filters?: ProposalFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['proposals', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('proposals')
        .select('*, client:clients(id, business_name), lead:leads(id, business_name)')
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status as any)
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as ProposalWithRelations[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useProposal(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, client:clients(id, business_name, contact_person, email, phone, address), lead:leads(id, business_name, contact_person, email, phone), proposal_items(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as ProposalDetail
    },
    enabled: !!id,
  })
}

interface CreateProposalData {
  proposal_number: string
  client_id?: string | null
  lead_id?: string | null
  valid_until?: string | null
  timeline?: string | null
  terms?: string | null
  status: string
  discount: number
  tax: number
  total: number
  items: Array<{
    service: string
    description?: string | null
    quantity: number
    unit_price: number
    total: number
  }>
}

export function useCreateProposal() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ items, ...data }: CreateProposalData) => {
      const { data: proposal, error } = await supabase
        .from('proposals')
        .insert({ ...data, tenant_id: profile!.tenant_id } as any)
        .select()
        .single()
      if (error) throw error

      if (items.length) {
        const { error: itemsError } = await supabase
          .from('proposal_items')
          .insert(items.map(item => ({ ...item, proposal_id: proposal.id })))
        if (itemsError) throw itemsError
      }

      return proposal as Proposal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      toast.success('Proposal created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateProposalData {
  id: string
  proposal_number?: string
  client_id?: string | null
  lead_id?: string | null
  valid_until?: string | null
  timeline?: string | null
  terms?: string | null
  status?: string
  discount?: number
  tax?: number
  total?: number
  items?: Array<{
    service: string
    description?: string | null
    quantity: number
    unit_price: number
    total: number
  }>
}

export function useUpdateProposal() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, items, ...data }: UpdateProposalData) => {
      const { data: updated, error } = await supabase
        .from('proposals')
        .update({ ...data } as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (items !== undefined) {
        await supabase.from('proposal_items').delete().eq('proposal_id', id)
        if (items.length) {
          const { error: itemsError } = await supabase
            .from('proposal_items')
            .insert(items.map(item => ({ ...item, proposal_id: id })))
          if (itemsError) throw itemsError
        }
      }

      return updated as Proposal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      queryClient.invalidateQueries({ queryKey: ['proposal', data.id] })
      toast.success('Proposal updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteProposal() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('proposals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      toast.success('Proposal deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update({ status: status as any })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Proposal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      queryClient.invalidateQueries({ queryKey: ['proposal', data.id] })
      toast.success('Status updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
