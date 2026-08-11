'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useConvertLeadToClient, LeadWithAssignee } from '@/lib/queries/use-leads'
import { toast } from 'sonner'

interface ConvertLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: LeadWithAssignee
}

export function ConvertLeadDialog({ open, onOpenChange, lead }: ConvertLeadDialogProps) {
  const router = useRouter()
  const convert = useConvertLeadToClient()
  const [createProject, setCreateProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  async function handleConfirm() {
    try {
      const result = await convert.mutateAsync({
        leadId: lead.id,
        createProject,
        projectName: projectName.trim() || lead.business_name,
        projectDescription: projectDescription.trim() || undefined,
      })
      onOpenChange(false)
      toast.success('Lead converted!', {
        action: {
          label: 'View Client',
          onClick: () => router.push(`/clients/${result.client.id}`),
        },
      })
    } catch {
      // handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead to Client</DialogTitle>
          <DialogDescription>
            Convert &quot;{lead.business_name}&quot; into a client record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Business:</span> {lead.business_name}</p>
            {lead.contact_person && <p><span className="text-muted-foreground">Contact:</span> {lead.contact_person}</p>}
            {lead.email && <p><span className="text-muted-foreground">Email:</span> {lead.email}</p>}
            {lead.phone && <p><span className="text-muted-foreground">Phone:</span> {lead.phone}</p>}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={createProject} onCheckedChange={v => setCreateProject(!!v)} />
            <span className="text-sm font-medium">Also create a project</span>
          </label>

          {createProject && (
            <div className="space-y-3 pl-6">
              <div className="space-y-2">
                <Label htmlFor="project_name">Project Name</Label>
                <Input
                  id="project_name"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder={lead.business_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_desc">Description</Label>
                <Textarea
                  id="project_desc"
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={convert.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={convert.isPending}>
            Convert to Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
