'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'

export function useAdminDashboardStats() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['admin-dashboard-stats', profile?.tenant_id],
    queryFn: async () => {
      const tid = profile!.tenant_id

      const [clients, projects, employees, tasks, payments] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).in('status', ['planning', 'in_progress', 'testing', 'waiting_for_client']),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('is_active', true),
        supabase.from('tasks').select('status').eq('tenant_id', tid),
        supabase.from('subscriptions').select('amount, billing_cycle, status, next_billing_date').eq('tenant_id', tid).eq('status', 'active'),
      ])

      const taskData = tasks.data ?? []
      const tasksPending = taskData.filter(t => t.status === 'pending').length
      const tasksCompleted = taskData.filter(t => t.status === 'completed').length

      const today = new Date().toISOString().split('T')[0]
      const subs = payments.data ?? []
      let mrr = 0
      let overdueCount = 0
      let pendingCount = 0
      for (const sub of subs) {
        const amt = Number(sub.amount)
        switch (sub.billing_cycle) {
          case 'monthly': mrr += amt; break
          case 'quarterly': mrr += amt / 3; break
          case 'half_yearly': mrr += amt / 6; break
          case 'yearly': mrr += amt / 12; break
        }
        if (sub.next_billing_date && sub.next_billing_date < today) overdueCount++
        else pendingCount++
      }

      return {
        totalClients: clients.count ?? 0,
        activeProjects: projects.count ?? 0,
        activeEmployees: employees.count ?? 0,
        mrr,
        pendingPayments: pendingCount,
        overduePayments: overdueCount,
        tasksPending,
        tasksCompleted,
      }
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useRevenueChartData() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['revenue-chart', profile?.tenant_id],
    queryFn: async () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const startDate = sixMonthsAgo.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('tenant_id', profile!.tenant_id)
        .eq('status', 'paid')
        .gte('payment_date', startDate)
      if (error) throw error

      const months: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        months[key] = 0
      }

      for (const p of data ?? []) {
        const key = p.payment_date.substring(0, 7)
        if (key in months) months[key] += Number(p.amount)
      }

      return Object.entries(months).map(([month, revenue]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        revenue,
      }))
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useClientGrowthData() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['client-growth', profile?.tenant_id],
    queryFn: async () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const startDate = sixMonthsAgo.toISOString()

      const { data, error } = await supabase
        .from('clients')
        .select('created_at')
        .eq('tenant_id', profile!.tenant_id)
        .gte('created_at', startDate)
      if (error) throw error

      const months: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        months[key] = 0
      }

      for (const c of data ?? []) {
        const key = c.created_at.substring(0, 7)
        if (key in months) months[key]++
      }

      return Object.entries(months).map(([month, clients]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        clients,
      }))
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useTaskDistribution() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['task-distribution', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .eq('tenant_id', profile!.tenant_id)
      if (error) throw error

      const counts: Record<string, number> = { pending: 0, in_progress: 0, completed: 0, blocked: 0, review: 0 }
      for (const t of data ?? []) {
        counts[t.status] = (counts[t.status] || 0) + 1
      }

      return [
        { name: 'Pending', value: counts.pending, color: '#f59e0b' },
        { name: 'In Progress', value: counts.in_progress, color: '#3b82f6' },
        { name: 'Completed', value: counts.completed, color: '#10b981' },
        { name: 'Blocked', value: counts.blocked, color: '#ef4444' },
      ].filter(d => d.value > 0)
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useLeadDistribution() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['lead-distribution', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('status')
        .eq('tenant_id', profile!.tenant_id)
      if (error) throw error

      let won = 0, lost = 0, active = 0
      for (const l of data ?? []) {
        if (l.status === 'won') won++
        else if (l.status === 'lost') lost++
        else active++
      }

      return [
        { name: 'Won', value: won, color: '#10b981' },
        { name: 'Lost', value: lost, color: '#ef4444' },
        { name: 'Active', value: active, color: '#3b82f6' },
      ].filter(d => d.value > 0)
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useEmployeeWorkload() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['employee-workload', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('assigned_to, assignee:profiles!tasks_assigned_to_fkey(full_name)')
        .eq('tenant_id', profile!.tenant_id)
        .not('assigned_to', 'is', null)
        .neq('status', 'completed')
      if (error) throw error

      const map: Record<string, { name: string; tasks: number }> = {}
      for (const t of data ?? []) {
        const id = t.assigned_to!
        if (!map[id]) map[id] = { name: (t.assignee as any)?.full_name || 'Unknown', tasks: 0 }
        map[id].tasks++
      }

      return Object.values(map).sort((a, b) => b.tasks - a.tasks).slice(0, 10)
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useUpcomingBilling() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['upcoming-billing', profile?.tenant_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, client:clients(business_name), service:services(name)')
        .eq('tenant_id', profile!.tenant_id)
        .eq('status', 'active')
        .gte('next_billing_date', today)
        .order('next_billing_date', { ascending: true })
        .limit(5)
      if (error) throw error
      return data
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useOverdueBilling() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['overdue-billing', profile?.tenant_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, client:clients(business_name), service:services(name)')
        .eq('tenant_id', profile!.tenant_id)
        .eq('status', 'active')
        .lt('next_billing_date', today)
        .order('next_billing_date', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useRecentLeads() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['recent-leads', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, business_name, status, source, created_at')
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useRecentActivity() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['recent-activity', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, actor:profiles!activity_logs_actor_id_fkey(full_name)')
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as unknown as Array<{
        id: string
        action: string
        entity_type: string
        entity_id: string | null
        metadata: any
        created_at: string
        actor: { full_name: string } | null
      }>
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useEmployeeDashboard() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['employee-dashboard', profile?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, project_id, projects(id, name)')
        .eq('assigned_to', profile!.id)
      if (error) throw error

      const total = tasks.length
      const dueToday = tasks.filter(t => t.due_date === today && t.status !== 'completed').length
      const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completed').length
      const completedThisWeek = tasks.filter(t => t.status === 'completed').length

      return { total, dueToday, overdue, completedThisWeek, tasks }
    },
    enabled: !!profile?.id,
  })
}
