'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Employee } from '@/lib/types/database'
import { toast } from 'sonner'

interface EmployeeFilters {
  is_active?: boolean
  role?: 'admin' | 'employee'
  department?: string
}

export function useEmployees(filters?: EmployeeFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['employees', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', profile!.tenant_id)
        .order('full_name')

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }
      if (filters?.role) {
        query = query.eq('role', filters.role)
      }
      if (filters?.department) {
        query = query.eq('department', filters.department)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Employee[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useEmployee(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Employee
    },
    enabled: !!id,
  })
}

interface CreateEmployeeData {
  email: string
  password: string
  full_name: string
  phone?: string
  role: 'admin' | 'employee'
  department?: string
  joining_date?: string
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEmployeeData) => {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create employee')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateEmployeeData {
  id: string
  full_name?: string
  phone?: string | null
  role?: 'admin' | 'employee'
  department?: string | null
  joining_date?: string | null
  avatar_url?: string | null
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateEmployeeData) => {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return updated as Employee
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee', data.id] })
      toast.success('Employee updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useToggleEmployeeStatus() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Employee
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee', data.id] })
      toast.success(`Employee ${data.is_active ? 'activated' : 'deactivated'} successfully`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
