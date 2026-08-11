'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Payment, PaymentMethod } from '@/lib/types/database'
import { toast } from 'sonner'

export type PaymentWithJoins = Payment & {
  client: { business_name: string } | null
  subscription: { amount: number; billing_cycle: string; service: { name: string } | null } | null
}

interface PaymentFilters {
  status?: string
  client_id?: string
  date_from?: string
  date_to?: string
}

export function usePayments(filters?: PaymentFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['payments', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*, client:clients(business_name), subscription:subscriptions(amount, billing_cycle, service:services(name))')
        .eq('tenant_id', profile!.tenant_id)
        .order('payment_date', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status as any)
      if (filters?.client_id) query = query.eq('client_id', filters.client_id)
      if (filters?.date_from) query = query.gte('payment_date', filters.date_from)
      if (filters?.date_to) query = query.lte('payment_date', filters.date_to)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as PaymentWithJoins[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function usePayment(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['payment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, client:clients(business_name), subscription:subscriptions(amount, billing_cycle, service:services(name))')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as PaymentWithJoins
    },
    enabled: !!id,
  })
}

interface CreatePaymentData {
  client_id: string
  subscription_id?: string | null
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  transaction_ref?: string | null
  invoice_number?: string | null
  notes?: string | null
  status?: string
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (data: CreatePaymentData) => {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({ ...data, tenant_id: profile!.tenant_id } as any)
        .select()
        .single()
      if (error) throw error
      return payment as Payment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-stats'] })
      toast.success('Payment recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdatePaymentData {
  id: string
  client_id?: string
  subscription_id?: string | null
  amount?: number
  payment_date?: string
  payment_method?: PaymentMethod
  transaction_ref?: string | null
  invoice_number?: string | null
  notes?: string | null
  status?: string
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePaymentData) => {
      const { data: updated, error } = await supabase
        .from('payments')
        .update({ ...data } as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return updated as Payment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment', data.id] })
      queryClient.invalidateQueries({ queryKey: ['revenue-stats'] })
      toast.success('Payment updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-stats'] })
      toast.success('Payment deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface RevenueStats {
  mrr: number
  arr: number
  totalPaid: number
  outstanding: number
}

export function useRevenueStats() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['revenue-stats', profile?.tenant_id],
    queryFn: async () => {
      const { data: subs, error: subErr } = await supabase
        .from('subscriptions')
        .select('amount, billing_cycle, status, next_billing_date')
        .eq('tenant_id', profile!.tenant_id)
        .eq('status', 'active')
      if (subErr) throw subErr

      let mrr = 0
      for (const sub of subs ?? []) {
        const amt = Number(sub.amount)
        switch (sub.billing_cycle) {
          case 'monthly': mrr += amt; break
          case 'quarterly': mrr += amt / 3; break
          case 'half_yearly': mrr += amt / 6; break
          case 'yearly': mrr += amt / 12; break
        }
      }

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const { data: paidPayments, error: paidErr } = await supabase
        .from('payments')
        .select('amount')
        .eq('tenant_id', profile!.tenant_id)
        .eq('status', 'paid')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd)
      if (paidErr) throw paidErr

      const totalPaid = (paidPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

      const today = now.toISOString().split('T')[0]
      const overdueSubs = (subs ?? []).filter(
        s => s.next_billing_date && s.next_billing_date < today
      )
      const outstanding = overdueSubs.reduce((sum, s) => sum + Number(s.amount), 0)

      return { mrr, arr: mrr * 12, totalPaid, outstanding } as RevenueStats
    },
    enabled: !!profile?.tenant_id,
  })
}
