'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { useRevenueChartData, useClientGrowthData, useTaskDistribution, useLeadDistribution, useEmployeeWorkload } from '@/lib/queries/use-dashboard'
import { usePayments, useRevenueStats } from '@/lib/queries/use-payments'
import { useClients } from '@/lib/queries/use-clients'
import { useTasks } from '@/lib/queries/use-tasks'
import { useLeads } from '@/lib/queries/use-leads'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { IndianRupee, TrendingUp, Target, FolderKanban } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899']

function useProjectsForReport() {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['projects-report', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, status')
        .eq('tenant_id', profile!.tenant_id)
      if (error) throw error
      return data as Array<{ id: string; status: string }>
    },
    enabled: !!profile?.tenant_id,
  })
}

export default function ReportsPage() {
  const { isAdmin } = useAuth()

  if (!isAdmin) return <div className="p-6"><p className="text-muted-foreground">Admin access required.</p></div>

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Business analytics and insights" />
      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue"><RevenueTab /></TabsContent>
        <TabsContent value="clients"><ClientsTab /></TabsContent>
        <TabsContent value="tasks"><TasksTab /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
        <TabsContent value="leads"><LeadsTab /></TabsContent>
        <TabsContent value="projects"><ProjectsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function RevenueTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data: revenueChart } = useRevenueChartData()
  const { data: stats } = useRevenueStats()
  const { data: payments } = usePayments({ date_from: dateFrom || undefined, date_to: dateTo || undefined })

  const totalFiltered = useMemo(() => (payments ?? []).reduce((s, p) => s + Number(p.amount), 0), [payments])

  return (
    <div className="space-y-6 mt-4">
      <div className="flex gap-4 items-end">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={IndianRupee} title="Total Revenue" value={formatCurrency(totalFiltered)} />
        <StatCard icon={TrendingUp} title="MRR" value={formatCurrency(stats?.mrr ?? 0)} />
        <StatCard icon={TrendingUp} title="ARR" value={formatCurrency(stats?.arr ?? 0)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue Over Time</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">Client</th><th className="text-left py-2">Amount</th><th className="text-left py-2">Date</th><th className="text-left py-2">Status</th></tr></thead>
              <tbody>
                {(payments ?? []).slice(0, 20).map(p => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">{p.client?.business_name}</td>
                    <td className="py-2">{formatCurrency(p.amount)}</td>
                    <td className="py-2">{p.payment_date}</td>
                    <td className="py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ClientsTab() {
  const { data: clientGrowth } = useClientGrowthData()
  const { data: clients } = useClients()

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of clients ?? []) counts[c.status] = (counts[c.status] || 0) + 1
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [clients])

  const byIndustry = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of clients ?? []) {
      const ind = c.industry || 'Unknown'
      counts[ind] = (counts[ind] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [clients])

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader><CardTitle>Client Growth</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={clientGrowth ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="clients" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Clients by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {byStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Clients by Industry</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byIndustry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TasksTab() {
  const { data: taskDist } = useTaskDistribution()
  const { data: workload } = useEmployeeWorkload()
  const { data: tasks } = useTasks()

  const byPriority = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks ?? []) counts[t.priority] = (counts[t.priority] || 0) + 1
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [tasks])

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Tasks by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={taskDist ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {(taskDist ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tasks by Priority</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {byPriority.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Employee Performance (Active Tasks)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workload ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip />
              <Bar dataKey="tasks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function AttendanceTab() {
  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader><CardTitle>Attendance Reports</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Attendance reports with working hours and summaries are available on the Attendance page.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function LeadsTab() {
  const { data: leadDist } = useLeadDistribution()
  const { data: leads } = useLeads()

  const bySource = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of leads ?? []) counts[l.source] = (counts[l.source] || 0) + 1
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [leads])

  const total = leads?.length ?? 0
  const won = leads?.filter(l => l.status === 'won').length ?? 0
  const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Target} title="Total Leads" value={total} />
        <StatCard icon={Target} title="Won" value={won} />
        <StatCard icon={TrendingUp} title="Conversion Rate" value={`${conversionRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Lead Conversion</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={leadDist ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {(leadDist ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Leads by Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {bySource.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ProjectsTab() {
  const { data: projects, isLoading } = useProjectsForReport()

  if (isLoading) return <LoadingSpinner />

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects ?? []) counts[p.status] = (counts[p.status] || 0) + 1
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [projects])

  const total = projects?.length ?? 0
  const completed = projects?.filter(p => p.status === 'completed').length ?? 0
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={FolderKanban} title="Total Projects" value={total} />
        <StatCard icon={Target} title="Completed" value={completed} />
        <StatCard icon={TrendingUp} title="Completion Rate" value={`${completionRate}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Projects by Status</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {byStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
