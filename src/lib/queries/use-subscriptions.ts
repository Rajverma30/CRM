'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Subscription, BillingCycle } from '@/lib/types/database'
import { toast } from 'sonner'

export type SubscriptionWithJoins = Subscription & {
  client: { business_name: string } | null
  service: { name: string } | null
}

interface SubscriptionFilters {
  status?: string
  client_id?: string
  billing_cycle?: string
}

const SELECT_WITH_JOINS = '*, client:clients(business_name), service:services(name)'

export function useSubscriptions(filters?: SubscriptionFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['subscriptions', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('subscriptions')
        .select(SELECT_WITH_JOINS)
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status as any)
      if (filters?.client_id) query = query.eq('client_id', filters.client_id)
      if (filters?.billing_cycle) query = query.eq('billing_cycle', filters.billing_cycle as any)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as SubscriptionWithJoins[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useSubscription(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['subscription', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(SELECT_WITH_JOINS)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as SubscriptionWithJoins
    },
    enabled: !!id,
  })
}

interface CreateSubscriptionData {
  client_id: string
  service_id?: string | null
  amount: number
  billing_cycle: BillingCycle
  start_date: string
  next_billing_date?: string | null
  status?: string
  notes?: string | null
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateSubscriptionData) => {
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .insert({ ...data, tenant_id: profile!.tenant_id } as any)
        .select()
        .single()
      if (error) throw error
      return sub as Subscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateSubscriptionData {
  id: string
  client_id?: string
  service_id?: string | null
  amount?: number
  billing_cycle?: BillingCycle
  start_date?: string
  next_billing_date?: string | null
  last_payment_date?: string | null
  status?: string
  notes?: string | null
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateSubscriptionData) => {
      const { data: updated, error } = await supabase
        .from('subscriptions')
        .update({ ...data } as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return updated as Subscription
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['subscription', data.id] })
      toast.success('Subscription updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

function getNextBillingDate(currentDate: string, cycle: BillingCycle): string {
  const d = new Date(currentDate)
  switch (cycle) {
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'half_yearly': d.setMonth(d.getMonth() + 6); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
    case 'one_time': break
  }
  return d.toISOString().split('T')[0]
}

interface MarkPaidData {
  subscriptionId: string
  payment_date: string
  payment_method: string
  transaction_ref?: string
}

export function useMarkSubscriptionPaid() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ subscriptionId, payment_date, payment_method, transaction_ref }: MarkPaidData) => {
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single()
      if (subError) throw subError

      const { error: payError } = await supabase.from('payments').insert({
        tenant_id: profile!.tenant_id,
        client_id: sub.client_id,
        subscription_id: subscriptionId,
        amount: sub.amount,
        payment_date,
        payment_method: payment_method as any,
        transaction_ref: transaction_ref || null,
        status: 'paid' as any,
      })
      if (payError) throw payError

      const nextDate = getNextBillingDate(sub.next_billing_date || payment_date, sub.billing_cycle)
      const updates: Record<string, unknown> = {
        last_payment_date: payment_date,
      }
      if (sub.billing_cycle !== 'one_time') {
        updates.next_billing_date = nextDate
      } else {
        updates.status = 'completed'
      }

      const { error: updError } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
      if (updError) throw updError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-stats'] })
      toast.success('Payment recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export { getNextBillingDate }
