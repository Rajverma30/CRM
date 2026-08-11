'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Employee } from '@/lib/types/database'
import { useCreateEmployee, useUpdateEmployee } from '@/lib/queries/use-employees'
import { EMPLOYEE_POSITIONS } from '@/lib/constants/employee-positions'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EmployeeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
}

interface FormData {
  full_name: string
  email: string
  phone: string
  role: 'admin' | 'employee'
  department: string
  joining_date: string
  password: string
}

export function EmployeeForm({ open, onOpenChange, employee }: EmployeeFormProps) {
  const isEdit = !!employee
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const isSubmitting = createEmployee.isPending || updateEmployee.isPending

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      role: 'employee',
      department: '',
      joining_date: '',
      password: '',
    },
  })

  useEffect(() => {
    if (!open) return

    if (employee) {
      reset({
        full_name: employee.full_name,
        email: employee.email,
        phone: employee.phone ?? '',
        role: employee.role,
        department: employee.department ?? '',
        joining_date: employee.joining_date ?? '',
        password: '',
      })
    } else {
      reset({
        full_name: '',
        email: '',
        phone: '',
        role: 'employee',
        department: '',
        joining_date: '',
        password: '',
      })
    }
  }, [open, employee, reset])

  const onSubmit = async (data: FormData) => {
    if (isEdit) {
      await updateEmployee.mutateAsync({
        id: employee!.id,
        full_name: data.full_name,
        phone: data.phone || null,
        role: data.role,
        department: data.department || null,
        joining_date: data.joining_date || null,
      })
    } else {
      await createEmployee.mutateAsync({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone || undefined,
        role: data.role,
        department: data.department || undefined,
        joining_date: data.joining_date || undefined,
      })
    }
    onOpenChange(false)
  }

  const role = watch('role')
  const department = watch('department')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              {...register('full_name', { required: 'Full name is required' })}
            />
            {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              disabled={isEdit}
              {...register('email', { required: !isEdit ? 'Email is required' : false })}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
          </div>

          <div className="space-y-2">
            <Label>System Role *</Label>
            <Select value={role} onValueChange={(v) => setValue('role', v as 'admin' | 'employee')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Admin can manage CRM; Employee has limited access.</p>
          </div>

          <div className="space-y-2">
            <Label>Position / Job Title</Label>
            <Select
              value={department || 'none'}
              onValueChange={(v) => setValue('department', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">Not specified</SelectItem>
                {EMPLOYEE_POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="joining_date">Joining Date</Label>
            <Input id="joining_date" type="date" {...register('joining_date')} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
