'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useLead, useDeleteLead } from '@/lib/queries/use-leads'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Pencil, Trash2, ArrowRightLeft, AlertTriangle } from 'lucide-react'
import { formatDate, formatCurrency, capitalize, getInitials } from '@/lib/utils'
import { LeadForm } from '@/components/modules/leads/lead-form'
import { ConvertLeadDialog } from '@/components/modules/leads/convert-lead-dialog'

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { data: lead, isLoading } = useLead(id)
  const deleteLead = useDeleteLead()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  if (!isAdmin) {
    return <EmptyState icon={AlertTriangle} title="Access Denied" description="Only admins can view lead details." />
  }

  if (isLoading) return <LoadingSpinner />
  if (!lead) return <EmptyState icon={AlertTriangle} title="Lead not found" description="This lead does not exist." />

  const canConvert = lead.status === 'won' || lead.status === 'negotiation'

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/leads')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{lead.business_name}</h1>
            <StatusBadge status={lead.status} />
            <Badge variant="outline">{capitalize(lead.source)}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          {canConvert && (
            <Button onClick={() => setConvertOpen(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Convert to Client
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Contact Person</p>
            <p className="font-medium">{lead.contact_person ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{lead.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{lead.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Industry</p>
            <p className="font-medium">{lead.industry ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Website</p>
            {lead.website ? (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                {lead.website}
              </a>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Interested Service</p>
            <p className="font-medium">{lead.interested_service ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estimated Budget</p>
            <p className="font-medium">{lead.estimated_budget ? formatCurrency(lead.estimated_budget) : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Assigned To</p>
            {lead.assignee ? (
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={lead.assignee.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{getInitials(lead.assignee.full_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{lead.assignee.full_name}</span>
              </div>
            ) : (
              <p className="font-medium">Unassigned</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(lead.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">{formatDate(lead.updated_at)}</p>
          </div>
        </CardContent>
      </Card>

      {lead.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      <LeadForm open={formOpen} onOpenChange={setFormOpen} lead={lead} />

      {canConvert && (
        <ConvertLeadDialog open={convertOpen} onOpenChange={setConvertOpen} lead={lead} />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteLead.isPending}
        onConfirm={() => {
          deleteLead.mutate(id, {
            onSuccess: () => {
              setDeleteOpen(false)
              router.push('/leads')
            },
          })
        }}
      />
    </div>
  )
}
