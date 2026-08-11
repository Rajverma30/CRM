'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Project, ProjectStatus } from '@/lib/types/database'
import { toast } from 'sonner'

interface ProjectFilters {
  status?: ProjectStatus
  client_id?: string
}

export interface ProjectWithClient extends Project {
  clients: { id: string; business_name: string } | null
  member_count?: number
}

export interface ProjectDetail extends Project {
  clients: { id: string; business_name: string } | null
  project_members: {
    id: string
    profile_id: string
    profiles: { id: string; full_name: string; avatar_url: string | null; role: string }
  }[]
}

export function useProjects(filters?: ProjectFilters) {
  const { profile } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['projects', profile?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*, clients(id, business_name), project_members(id)')
        .eq('tenant_id', profile!.tenant_id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id)
      }

      const { data, error } = await query
      if (error) throw error

      return (data as unknown as (ProjectWithClient & { project_members: { id: string }[] })[]).map(p => ({
        ...p,
        member_count: p.project_members?.length ?? 0,
        project_members: undefined,
      })) as ProjectWithClient[]
    },
    enabled: !!profile?.tenant_id,
  })
}

export function useProject(id: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(id, business_name), project_members(id, profile_id, profiles(id, full_name, avatar_url, role))')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as ProjectDetail
    },
    enabled: !!id,
  })
}

interface CreateProjectData {
  name: string
  client_id?: string | null
  description?: string | null
  start_date?: string | null
  deadline?: string | null
  budget?: number | null
  status?: ProjectStatus
  website_url?: string | null
  member_ids?: string[]
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ member_ids, ...data }: CreateProjectData) => {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({ ...data, tenant_id: profile!.tenant_id })
        .select()
        .single()
      if (error) throw error

      if (member_ids?.length) {
        const { error: memberError } = await supabase
          .from('project_members')
          .insert(member_ids.map(pid => ({ project_id: project.id, profile_id: pid })))
        if (memberError) throw memberError
      }

      return project as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateProjectData {
  id: string
  name?: string
  client_id?: string | null
  description?: string | null
  start_date?: string | null
  deadline?: string | null
  budget?: number | null
  status?: ProjectStatus
  website_url?: string | null
  member_ids?: string[]
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, member_ids, ...data }: UpdateProjectData) => {
      const { data: project, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (member_ids !== undefined) {
        await supabase.from('project_members').delete().eq('project_id', id)
        if (member_ids.length) {
          const { error: memberError } = await supabase
            .from('project_members')
            .insert(member_ids.map(pid => ({ project_id: id, profile_id: pid })))
          if (memberError) throw memberError
        }
      }

      return project as Project
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', data.id] })
      toast.success('Project updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useProjectMembers(projectId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('id, profile_id, profiles(id, full_name, avatar_url, role)')
        .eq('project_id', projectId!)
      if (error) throw error
      return data as unknown as {
        id: string
        profile_id: string
        profiles: { id: string; full_name: string; avatar_url: string | null; role: string }
      }[]
    },
    enabled: !!projectId,
  })
}

export function useUpdateProjectMembers() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ projectId, memberIds }: { projectId: string; memberIds: string[] }) => {
      await supabase.from('project_members').delete().eq('project_id', projectId)
      if (memberIds.length) {
        const { error } = await supabase
          .from('project_members')
          .insert(memberIds.map(pid => ({ project_id: projectId, profile_id: pid })))
        if (error) throw error
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', vars.projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', vars.projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project members updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
