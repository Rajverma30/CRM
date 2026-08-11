'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useEmployee, useToggleEmployeeStatus } from '@/lib/queries/use-employees'
import { Employee } from '@/lib/types/database'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Pencil, UserCheck, UserX, CheckSquare, FolderKanban, CalendarCheck, Activity } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { EmployeeForm } from '@/components/modules/employees/employee-form'

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { data: employee, isLoading } = useEmployee(id)
  const toggleStatus = useToggleEmployeeStatus()
  const [formOpen, setFormOpen] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (!employee) return <EmptyState icon={UserCheck} title="Employee not found" description="This employee does not exist." />

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/employees')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
      </Button>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={employee.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">{getInitials(employee.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{employee.full_name}</h1>
            <p className="text-muted-foreground">{employee.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>{employee.role}</Badge>
              <StatusBadge status={employee.is_active ? 'active' : 'inactive'} />
              {employee.department && <Badge variant="outline">{employee.department}</Badge>}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleStatus.mutate({ id: employee.id, is_active: !employee.is_active })}
            >
              {employee.is_active ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
              {employee.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{employee.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{employee.department || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Joining Date</p>
            <p className="font-medium">{employee.joining_date ? formatDate(employee.joining_date) : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member Since</p>
            <p className="font-medium">{formatDate(employee.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Tasks" value="—" icon={CheckSquare} />
            <StatCard title="Completed Tasks" value="—" icon={CheckSquare} />
            <StatCard title="Active Projects" value="—" icon={FolderKanban} />
            <StatCard title="Attendance This Month" value="—" icon={CalendarCheck} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Activity}
                title="No recent activity"
                description="Activity will appear here as this employee performs actions."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={CheckSquare}
                title="No tasks assigned"
                description="Tasks assigned to this employee will appear here."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={FolderKanban}
                title="No projects"
                description="Projects this employee is a member of will appear here."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={CalendarCheck}
                title="No attendance records"
                description="Attendance data will appear here once tracking begins."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Activity}
                title="No activity logged"
                description="Actions performed by this employee will be recorded here."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmployeeForm open={formOpen} onOpenChange={setFormOpen} employee={employee} />
    </div>
  )
}
