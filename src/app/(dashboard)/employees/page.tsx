'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useEmployees, useToggleEmployeeStatus } from '@/lib/queries/use-employees'
import { Employee } from '@/lib/types/database'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Eye, Pencil, UserCheck, UserX } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { EmployeeForm } from '@/components/modules/employees/employee-form'

export default function EmployeesPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  const filters = useMemo(() => {
    const f: { is_active?: boolean; role?: 'admin' | 'employee'; department?: string } = {}
    if (statusFilter === 'active') f.is_active = true
    if (statusFilter === 'inactive') f.is_active = false
    if (roleFilter !== 'all') f.role = roleFilter as 'admin' | 'employee'
    if (departmentFilter !== 'all') f.department = departmentFilter
    return f
  }, [statusFilter, roleFilter, departmentFilter])

  const { data: employees = [], isLoading } = useEmployees(filters)
  const toggleStatus = useToggleEmployeeStatus()

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean))
    return Array.from(depts) as string[]
  }, [employees])

  const columns: Column<Employee>[] = [
    {
      key: 'full_name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{getInitials(row.full_name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.full_name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Phone' },
    {
      key: 'department',
      header: 'Position',
      sortable: true,
      render: (row) => row.department ?? '—',
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'default' : 'secondary'}>
          {row.role}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'joining_date',
      header: 'Joined',
      sortable: true,
      render: (row) => row.joining_date ? formatDate(row.joining_date) : '—',
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => router.push(`/employees/${row.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => { setEditingEmployee(row); setFormOpen(true) }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: row.id, is_active: !row.is_active })}>
                  {row.is_active ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                  {row.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage your team members">
        {isAdmin && (
          <Button onClick={() => { setEditingEmployee(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>

        {departments.length > 0 && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All Positions</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable
        columns={columns}
        data={employees as any[]}
        loading={isLoading}
        searchKey="full_name"
        searchPlaceholder="Search by name..."
        onRowClick={(row) => router.push(`/employees/${(row as unknown as Employee).id}`)}
        emptyTitle="No employees found"
        emptyDescription="Get started by adding your first team member."
      />

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
      />
    </div>
  )
}
