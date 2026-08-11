'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/auth-context'
import { useClients } from '@/lib/queries/use-clients'
import { useCreateClientRequest, useUpdateClientRequest, ClientRequestWithClient } from '@/lib/queries/use-client-requests'
import { TaskPriority, RequestStatus } from '@/lib/types/database'
import { capitalize } from '@/lib/utils'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const STATUSES: RequestStatus[] = ['new', 'reviewing', 'approved', 'converted', 'completed', 'rejected']

interface RequestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request?: ClientRequestWithClient | null
}

export function RequestForm({ open, onOpenChange, request }: RequestFormProps) {
  const isEdit = !!request
  const { isAdmin } = useAuth()
  const { data: clients = [] } = useClients()
  const createRequest = useCreateClientRequest()
  const updateRequest = useUpdateClientRequest()

  const [form, setForm] = useState({
    client_id: '',
    title: '',
    description: '',
    priority: 'medium' as string,
    status: 'new' as string,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      if (request) {
        setForm({
          client_id: request.client_id,
          title: request.title,
          description: request.description ?? '',
          priority: request.priority,
          status: request.status,
        })
      } else {
        setForm({ client_id: '', title: '', description: '', priority: 'medium', status: 'new' })
      }
      setError('')
    }
  }, [open, request])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.client_id) { setError('Client is required'); return }
    setError('')

    const payload = {
      client_id: form.client_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority as TaskPriority,
      ...(isAdmin ? { status: form.status as RequestStatus } : {}),
    }

    try {
      if (isEdit) {
        await updateRequest.mutateAsync({ id: request.id, ...payload })
      } else {
        await createRequest.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // handled by mutation
    }
  }

  const isPending = createRequest.isPending || updateRequest.isPending
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Request' : 'New Request'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={form.client_id || '_none'} onValueChange={v => set('client_id', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select client</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={e => set('description', e.target.value)} rows={4} />
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
            {isAdmin && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Save Changes' : 'Create Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
