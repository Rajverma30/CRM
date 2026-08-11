'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConvertRequestToTask, ClientRequestWithClient } from '@/lib/queries/use-client-requests'
import { useEmployees } from '@/lib/queries/use-employees'
import { useProjects } from '@/lib/queries/use-projects'
import { TaskPriority } from '@/lib/types/database'
import { capitalize } from '@/lib/utils'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

interface ConvertToTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: ClientRequestWithClient
}

export function ConvertToTaskDialog({ open, onOpenChange, request }: ConvertToTaskDialogProps) {
  const convert = useConvertRequestToTask()
  const { data: employees = [] } = useEmployees({ is_active: true })
  const { data: projects = [] } = useProjects({ client_id: request.client_id })

  const [form, setForm] = useState({
    project_id: '',
    assigned_to: '',
    priority: request.priority as string,
    due_date: '',
  })

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  async function handleConfirm() {
    try {
      await convert.mutateAsync({
        requestId: request.id,
        project_id: form.project_id || null,
        assigned_to: form.assigned_to || null,
        priority: form.priority as TaskPriority,
        due_date: form.due_date || null,
      })
      onOpenChange(false)
    } catch {
      // handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Task</DialogTitle>
          <DialogDescription>
            Create a task from &quot;{request.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Title:</span> {request.title}</p>
            <p><span className="text-muted-foreground">Client:</span> {request.clients?.business_name ?? '—'}</p>
            {request.description && (
              <p className="text-muted-foreground line-clamp-2">{request.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={form.project_id || '_none'} onValueChange={v => set('project_id', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={form.assigned_to || '_none'} onValueChange={v => set('assigned_to', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Unassigned</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>{capitalize(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={convert.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={convert.isPending}>
            Convert to Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
