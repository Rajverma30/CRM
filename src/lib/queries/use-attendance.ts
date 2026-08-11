'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from 'sonner'

export interface AttendanceRecord {
  id: string
  tenant_id: string
  profile_id: string
  date: string
  check_in: string | null
  check_out: string | null
  total_hours: number | null
  status: 'present' | 'absent' | 'half_day' | 'leave'
  created_at: string
  updated_at: string
}

export interface AttendanceWithEmployee extends AttendanceRecord {
  profiles: { id: string; full_name: string; avatar_url: string | null }
}

interface AttendanceFilters {
  profile_id?: string
  date_from?: string
  date_to?: string
  status?: AttendanceRecord['status']
}

export function useAttendance(filters?: AttendanceFilters) {
  const { profile, isAdmin } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['attendance', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('tenant_id', profile!.tenant_id)
        .order('date', { ascending: false })

      if (!isAdmin) {
        query = query.eq('profile_id', profile!.id)
      }

      if (filters?.profile_id) query = query.eq('profile_id', filters.profile_id)
      if (filters?.date_from) query = query.gte('date', filters.date_from)
      if (filters?.date_to) query = query.lte('date', filters.date_to)
      if (filters?.status) query = query.eq('status', filters.status)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as AttendanceWithEmployee[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useTodayAttendance() {
  const { profile } = useAuth()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: ['attendance', 'today', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profile!.id)
        .eq('date', today)
        .maybeSingle()
      if (error) throw error
      return data as AttendanceRecord | null
    },
    enabled: !!profile?.id,
  })
}

export function useCheckIn() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          tenant_id: profile!.tenant_id,
          profile_id: profile!.id,
          date: today,
          check_in: new Date().toISOString(),
          status: 'present' as const,
        })
        .select()
        .single()
      if (error) throw error
      return data as AttendanceRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      toast.success('Checked in successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useCheckOut() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('profile_id', profile!.id)
        .eq('date', today)
        .select()
        .single()
      if (error) throw error
      return data as AttendanceRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      toast.success('Checked out successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useMonthlyAttendance(profileId: string | 'all' | undefined, month: number, year: number) {
  const { profile } = useAuth()
  const supabase = createClient()
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return useQuery({
    queryKey: ['attendance', 'monthly', profileId, month, year],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('tenant_id', profile!.tenant_id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true })

      if (profileId && profileId !== 'all') {
        query = query.eq('profile_id', profileId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as AttendanceWithEmployee[]
    },
    enabled: !!profile?.tenant_id && !!profileId,
  })
}

export interface AttendanceStats {
  present: number
  absent: number
  half_day: number
  leave: number
  avgHours: number
}

export function useAttendanceStats(profileId?: string) {
  const { profile, isAdmin } = useAuth()
  const supabase = createClient()
  const now = new Date()
  const dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const targetId = profileId ?? (isAdmin ? undefined : profile?.id)

  return useQuery({
    queryKey: ['attendance', 'stats', targetId, now.getMonth(), now.getFullYear()],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select('status, total_hours')
        .eq('tenant_id', profile!.tenant_id)
        .gte('date', dateFrom)
        .lte('date', dateTo)

      if (targetId) query = query.eq('profile_id', targetId)

      const { data, error } = await query
      if (error) throw error

      const records = data as { status: string; total_hours: number | null }[]
      const stats: AttendanceStats = { present: 0, absent: 0, half_day: 0, leave: 0, avgHours: 0 }
      let totalHours = 0
      let hoursCount = 0

      for (const r of records) {
        if (r.status === 'present') stats.present++
        else if (r.status === 'absent') stats.absent++
        else if (r.status === 'half_day') stats.half_day++
        else if (r.status === 'leave') stats.leave++
        if (r.total_hours) {
          totalHours += r.total_hours
          hoursCount++
        }
      }

      stats.avgHours = hoursCount > 0 ? Math.round((totalHours / hoursCount) * 10) / 10 : 0
      return stats
    },
    enabled: !!profile?.tenant_id,
  })
}
