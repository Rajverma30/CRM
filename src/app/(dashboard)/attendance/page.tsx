'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import {
  useAttendance,
  useMonthlyAttendance,
  useAttendanceStats,
  AttendanceWithEmployee,
} from '@/lib/queries/use-attendance'
import { useEmployees } from '@/lib/queries/use-employees'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  CalendarDays,
  UserCheck,
  UserX,
  Timer,
  Users,
} from 'lucide-react'
import { formatTime, formatDate, getInitials } from '@/lib/utils'
import { CheckInOutCard } from '@/components/modules/attendance/check-in-out-card'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function EmployeeView() {
  const { profile } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { data: stats } = useAttendanceStats(profile?.id)
  const { data: monthly = [], isLoading } = useMonthlyAttendance(profile?.id, month, year)

  const columns: Column<AttendanceWithEmployee>[] = [
    { key: 'date', header: 'Date', sortable: true, render: (r) => formatDate(r.date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'check_in', header: 'Check In', render: (r) => r.check_in ? formatTime(r.check_in) : '—' },
    { key: 'check_out', header: 'Check Out', render: (r) => r.check_out ? formatTime(r.check_out) : '—' },
    { key: 'total_hours', header: 'Hours', render: (r) => r.total_hours != null ? `${r.total_hours}h` : '—' },
  ]

  return (
    <>
      <CheckInOutCard />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} title="Days Present" value={stats?.present ?? 0} />
        <StatCard icon={UserX} title="Days Absent" value={stats?.absent ?? 0} />
        <StatCard icon={CalendarDays} title="Leaves" value={stats?.leave ?? 0} />
        <StatCard icon={Timer} title="Avg Hours" value={stats?.avgHours ? `${stats.avgHours}h` : '—'} />
      </div>

      <div className="flex items-center gap-3">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={monthly as any[]}
        loading={isLoading}
        emptyTitle="No records"
        emptyDescription="No attendance records for this month."
      />
    </>
  )
}

function AdminView() {
  const now = new Date()
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [employeeId, setEmployeeId] = useState<string>('all')

  const today = now.toISOString().split('T')[0]
  const { data: todayRecords = [], isLoading: loadingToday } = useAttendance({ date_from: today, date_to: today })
  const { data: employees = [] } = useEmployees({ is_active: true })
  const { data: stats } = useAttendanceStats()

  const { data: monthlyData = [], isLoading: loadingMonthly } = useMonthlyAttendance(
    employeeId,
    month,
    year,
  )

  const presentCount = todayRecords.filter((r) => r.status === 'present').length
  const totalEmployees = employees.length
  const attendancePct = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0

  const employeeColumn: Column<AttendanceWithEmployee> = {
    key: 'employee',
    header: 'Employee',
    render: (r) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px]">{getInitials(r.profiles?.full_name ?? '?')}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{r.profiles?.full_name ?? 'Unknown'}</span>
      </div>
    ),
  }

  const dailyColumns: Column<AttendanceWithEmployee>[] = [
    employeeColumn,
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'check_in', header: 'Check In', render: (r) => r.check_in ? formatTime(r.check_in) : '—' },
    { key: 'check_out', header: 'Check Out', render: (r) => r.check_out ? formatTime(r.check_out) : '—' },
    { key: 'total_hours', header: 'Hours', render: (r) => r.total_hours != null ? `${r.total_hours}h` : '—' },
  ]

  const monthlyColumns: Column<AttendanceWithEmployee>[] = [
    ...(employeeId === 'all' ? [employeeColumn] : []),
    { key: 'date', header: 'Date', sortable: true, render: (r) => formatDate(r.date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'check_in', header: 'Check In', render: (r) => r.check_in ? formatTime(r.check_in) : '—' },
    { key: 'check_out', header: 'Check Out', render: (r) => r.check_out ? formatTime(r.check_out) : '—' },
    { key: 'total_hours', header: 'Hours', render: (r) => r.total_hours != null ? `${r.total_hours}h` : '—' },
  ]

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today&apos;s Overview — {formatDate(today)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span><strong>{presentCount}</strong> / {totalEmployees} present</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span>{attendancePct}% attendance</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Team Attendance" value={`${attendancePct}%`} />
        <StatCard icon={Timer} title="Avg Hours" value={stats?.avgHours ? `${stats.avgHours}h` : '—'} />
        <StatCard icon={UserCheck} title="Present Today" value={presentCount} />
        <StatCard icon={UserX} title="Absent Today" value={totalEmployees - presentCount} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'daily' | 'monthly')}>
        <TabsList>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'daily' && (
        <DataTable
          columns={dailyColumns}
          data={todayRecords as any[]}
          loading={loadingToday}
          searchKey="profiles"
          searchPlaceholder="Search employees..."
          emptyTitle="No attendance today"
          emptyDescription="No employees have checked in yet."
        />
      )}

      {tab === 'monthly' && (
        <>
          <div className="flex flex-wrap gap-3">
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={monthlyColumns}
            data={monthlyData as any[]}
            loading={loadingMonthly}
            emptyTitle="No records"
            emptyDescription="No attendance records for this period."
          />
        </>
      )}
    </>
  )
}

export default function AttendancePage() {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Track and manage attendance records" />
      {isAdmin ? <AdminView /> : <EmployeeView />}
    </div>
  )
}
