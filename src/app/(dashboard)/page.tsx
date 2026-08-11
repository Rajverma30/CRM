'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useAdminDashboardStats, useRevenueChartData, useClientGrowthData, useTaskDistribution, useLeadDistribution, useEmployeeWorkload, useUpcomingBilling, useOverdueBilling, useRecentLeads, useRecentActivity } from '@/lib/queries/use-dashboard'
import { useRevenueStats } from '@/lib/queries/use-payments'
import { useMyTasks } from '@/lib/queries/use-tasks'
import { useAttendance } from '@/lib/queries/use-attendance'
import { useEmployees } from '@/lib/queries/use-employees'
import { CheckInOutCard } from '@/components/modules/attendance/check-in-out-card'
import { ProfileCard } from '@/components/modules/employees/profile-card'
import { TaskForm } from '@/components/modules/tasks/task-form'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, FolderKanban, UserCheck, IndianRupee, Clock, AlertTriangle, CheckCircle2, ListTodo, Activity, CalendarCheck, Plus } from 'lucide-react'
import { formatCurrency, formatDate, formatTime, getInitials } from '@/lib/utils'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Link from 'next/link'

export default function DashboardPage() {
  const { profile, isAdmin, isLoading } = useAuth()

  if (isLoading || !profile) return <LoadingSpinner />

  return isAdmin ? <AdminDashboard name={profile.full_name} /> : <EmployeeDashboard name={profile.full_name} />
}

function TodayAttendanceCard() {
  const today = new Date().toISOString().split('T')[0]
  const { data: todayRecords = [], isLoading } = useAttendance({ date_from: today, date_to: today })
  const { data: employees = [] } = useEmployees({ is_active: true })

  const presentCount = todayRecords.filter((r) => r.status === 'present' || r.status === 'half_day').length
  const checkedIn = todayRecords.filter((r) => r.check_in && !r.check_out).length
  const totalEmployees = employees.length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" />
          Today&apos;s Attendance
        </CardTitle>
        <Link href="/attendance" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <span><strong>{presentCount}</strong> / {totalEmployees} present</span>
          <span className="text-muted-foreground">{checkedIn} still checked in</span>
        </div>
        {isLoading ? (
          <LoadingSpinner className="py-6" />
        ) : !todayRecords.length ? (
          <p className="text-sm text-muted-foreground">No employees have checked in yet today.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todayRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px]">{getInitials(r.profiles?.full_name ?? '?')}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate">{r.profiles?.full_name ?? 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground w-28 text-right">
                    {r.check_in ? formatTime(r.check_in) : '—'}
                    {r.check_out ? ` – ${formatTime(r.check_out)}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AdminDashboard({ name }: { name: string }) {
  const { data: stats, isLoading } = useAdminDashboardStats()
  const { data: revenueStats } = useRevenueStats()
  const { data: revenueChart } = useRevenueChartData()
  const { data: clientGrowth } = useClientGrowthData()
  const { data: taskDist } = useTaskDistribution()
  const { data: leadDist } = useLeadDistribution()
  const { data: workload } = useEmployeeWorkload()
  const { data: upcoming } = useUpcomingBilling()
  const { data: overdue } = useOverdueBilling()
  const { data: recentLeads } = useRecentLeads()
  const { data: activity } = useRecentActivity()

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome back, {name.split(' ')[0]}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total Clients" value={stats?.totalClients ?? 0} />
        <StatCard icon={FolderKanban} title="Active Projects" value={stats?.activeProjects ?? 0} />
        <StatCard icon={UserCheck} title="Active Employees" value={stats?.activeEmployees ?? 0} />
        <StatCard icon={IndianRupee} title="Monthly Revenue" value={formatCurrency(revenueStats?.mrr ?? stats?.mrr ?? 0)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} title="Pending Payments" value={stats?.pendingPayments ?? 0} />
        <StatCard icon={AlertTriangle} title="Overdue Payments" value={stats?.overduePayments ?? 0} />
        <StatCard icon={ListTodo} title="Tasks Pending" value={stats?.tasksPending ?? 0} />
        <StatCard icon={CheckCircle2} title="Tasks Completed" value={stats?.tasksCompleted ?? 0} />
      </div>

      <TodayAttendanceCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
          <CardHeader><CardTitle>Client Growth</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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

        <Card>
          <CardHeader><CardTitle>Task Completion</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={taskDist ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {(taskDist ?? []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lead Conversion</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={leadDist ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {(leadDist ?? []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Upcoming Billing</CardTitle></CardHeader>
          <CardContent>
            {!upcoming?.length ? <p className="text-muted-foreground text-sm">No upcoming billing</p> : (
              <div className="space-y-3">
                {upcoming.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{s.client?.business_name}</p>
                      <p className="text-muted-foreground">{s.service?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(s.amount)}</p>
                      <p className="text-muted-foreground">{formatDate(s.next_billing_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Overdue Payments</CardTitle></CardHeader>
          <CardContent>
            {!overdue?.length ? <p className="text-muted-foreground text-sm">No overdue payments</p> : (
              <div className="space-y-3">
                {overdue.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{s.client?.business_name}</p>
                      <p className="text-muted-foreground">{s.service?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">{formatCurrency(s.amount)}</p>
                      <p className="text-red-500 text-xs">Due {formatDate(s.next_billing_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Leads</CardTitle></CardHeader>
          <CardContent>
            {!recentLeads?.length ? <p className="text-muted-foreground text-sm">No leads yet</p> : (
              <div className="space-y-3">
                {recentLeads.map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between text-sm hover:bg-muted/50 p-2 rounded-md -mx-2">
                    <div>
                      <p className="font-medium">{l.business_name}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(l.created_at)}</p>
                    </div>
                    <StatusBadge status={l.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Employee Task Workload</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workload ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {!activity?.length ? <p className="text-muted-foreground text-sm">No recent activity</p> : (
            <div className="space-y-3">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <p><span className="font-medium">{a.actor?.full_name ?? 'System'}</span>{' '}{a.action} {a.entity_type}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EmployeeDashboard({ name }: { name: string }) {
  const { data: myTasks, isLoading } = useMyTasks()
  const [taskFormOpen, setTaskFormOpen] = useState(false)

  if (isLoading) return <LoadingSpinner />

  const today = new Date().toISOString().split('T')[0]
  const tasks = myTasks ?? []
  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Welcome, {name.split(' ')[0]}</h1>
        <Button onClick={() => setTaskFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Task
        </Button>
      </div>

      <CheckInOutCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Pending Tasks ({pending.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pending.length ? (
                <p className="text-sm text-muted-foreground py-4">No pending tasks. Create one to get started.</p>
              ) : (
                <div className="space-y-2">
                  {pending.map(t => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.title}</p>
                          {t.projects && <p className="text-xs text-muted-foreground">{t.projects.name}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={t.status} />
                          <Badge variant={t.priority === 'urgent' ? 'destructive' : t.priority === 'high' ? 'warning' : 'secondary'}>
                            {t.priority}
                          </Badge>
                          {t.due_date && (
                            <span className={`text-xs ${t.due_date < today ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {formatDate(t.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {pending.length > 0 && (
                <Link href="/tasks" className="inline-block mt-4 text-sm text-primary hover:underline">
                  View all my tasks →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <ProfileCard />
        </div>
      </div>

      <TaskForm open={taskFormOpen} onOpenChange={setTaskFormOpen} task={null} />
    </div>
  )
}
