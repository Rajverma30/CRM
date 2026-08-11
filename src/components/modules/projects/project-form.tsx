'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/lib/auth/auth-context'
import { useCreateProject, useUpdateProject, ProjectWithClient } from '@/lib/queries/use-projects'
import { useEmployees } from '@/lib/queries/use-employees'
import { ProjectStatus } from '@/lib/types/database'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { capitalize } from '@/lib/utils'
import { useState } from 'react'

const PROJECT_STATUSES: ProjectStatus[] = [
  'planning', 'in_progress', 'testing', 'waiting_for_client', 'completed', 'on_hold', 'cancelled',
]

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectWithClient | null
}

interface FormData {
  name: string
  client_id: string
  description: string
  start_date: string
  deadline: string
  budget: string
  status: ProjectStatus
  website_url: string
}

export function ProjectForm({ open, onOpenChange, project }: ProjectFormProps) {
  const isEdit = !!project
  const { profile } = useAuth()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const isSubmitting = createProject.isPending || updateProject.isPending

  const supabase = createClient()
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, business_name')
        .eq('tenant_id', profile!.tenant_id)
        .order('business_name')
      if (error) throw error
      return data
    },
    enabled: !!profile?.tenant_id,
  })

  const { data: employees = [] } = useEmployees({ is_active: true })

  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      client_id: '',
      description: '',
      start_date: '',
      deadline: '',
      budget: '',
      status: 'planning',
      website_url: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (project) {
      reset({
        name: project.name,
        client_id: project.client_id ?? '',
        description: project.description ?? '',
        start_date: project.start_date ?? '',
        deadline: project.deadline ?? '',
        budget: project.budget != null ? String(project.budget) : '',
        status: project.status,
        website_url: project.website_url ?? '',
      })
    } else {
      reset({
        name: '',
        client_id: '',
        description: '',
        start_date: '',
        deadline: '',
        budget: '',
        status: 'planning',
        website_url: '',
      })
      setSelectedMembers([])
    }
  }, [project, open, reset])

  // Load existing members when editing
  useEffect(() => {
    if (!open || !project) return
    const supabase = createClient()
    supabase
      .from('project_members')
      .select('profile_id')
      .eq('project_id', project.id)
      .then(({ data }) => {
        if (data) setSelectedMembers(data.map(m => m.profile_id))
      })
  }, [open, project])

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      client_id: data.client_id || null,
      description: data.description || null,
      start_date: data.start_date || null,
      deadline: data.deadline || null,
      budget: data.budget ? Number(data.budget) : null,
      status: data.status,
      website_url: data.website_url || null,
      member_ids: selectedMembers,
    }

    if (isEdit) {
      await updateProject.mutateAsync({ id: project!.id, ...payload })
    } else {
      await createProject.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const status = watch('status')
  const clientId = watch('client_id')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Project name is required' })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={v => setValue('client_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setValue('status', v as ProjectStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" {...register('deadline')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (INR)</Label>
              <Input id="budget" type="number" step="0.01" {...register('budget')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input id="website_url" type="url" {...register('website_url')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Employees</Label>
            <ScrollArea className="h-40 rounded-md border p-3">
              <div className="space-y-2">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedMembers.includes(emp.id)}
                      onCheckedChange={() => toggleMember(emp.id)}
                    />
                    <span className="text-sm">{emp.full_name}</span>
                    {emp.department && (
                      <span className="text-xs text-muted-foreground">({emp.department})</span>
                    )}
                  </label>
                ))}
                {employees.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active employees found</p>
                )}
              </div>
            </ScrollArea>
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
