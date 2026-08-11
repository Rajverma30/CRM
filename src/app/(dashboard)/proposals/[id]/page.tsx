'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Download, Trash2, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth/auth-context'
import { useProposal, useDeleteProposal, useUpdateProposalStatus } from '@/lib/queries/use-proposals'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ProposalPDF, downloadPDF } from '@/components/modules/proposals/proposal-pdf'

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)

  const { data: proposal, isLoading } = useProposal(id)
  const deleteProposal = useDeleteProposal()
  const updateStatus = useUpdateProposalStatus()

  if (!isAdmin) {
    return <EmptyState icon={FileText} title="Access Denied" description="Only admins can view proposals." />
  }

  if (isLoading) return <LoadingSpinner />
  if (!proposal) return <EmptyState icon={FileText} title="Proposal not found" description="This proposal doesn't exist or you don't have access." />

  const contact = proposal.client || proposal.lead
  const subtotal = proposal.proposal_items.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = proposal.discount || 0
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * (proposal.tax / 100)
  const grandTotal = taxableAmount + taxAmount

  if (showPrintView) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between print:hidden">
          <Button variant="ghost" size="sm" onClick={() => setShowPrintView(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={() => downloadPDF()}>
            <Download className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden print:border-none">
          <ProposalPDF proposal={proposal} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.push('/proposals')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Proposals
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{proposal.proposal_number}</h1>
              <StatusBadge status={proposal.status} />
            </div>
            {contact && <p className="text-muted-foreground mt-1">{contact.business_name}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => router.push(`/proposals/new?edit=${id}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setShowPrintView(true)}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Select value={proposal.status} onValueChange={status => updateStatus.mutate({ id, status })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Service</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Unit Price</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.proposal_items.map((item, i) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-3 font-medium">{item.service}</td>
                        <td className="py-3 text-muted-foreground">{item.description || '—'}</td>
                        <td className="py-3 text-right">{item.quantity}</td>
                        <td className="py-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-red-500">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({proposal.tax}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline & Terms */}
          {(proposal.timeline || proposal.terms) && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {proposal.timeline && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Timeline</h3>
                    <p className="text-sm whitespace-pre-wrap">{proposal.timeline}</p>
                  </div>
                )}
                {proposal.terms && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Terms & Conditions</h3>
                    <p className="text-sm whitespace-pre-wrap">{proposal.terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proposal #</span>
                <span className="font-medium">{proposal.proposal_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={proposal.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(proposal.created_at)}</span>
              </div>
              {proposal.valid_until && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span>{formatDate(proposal.valid_until)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {contact && (
            <Card>
              <CardHeader><CardTitle>{proposal.client_id ? 'Client' : 'Lead'}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{contact.business_name}</p>
                {contact.contact_person && <p className="text-muted-foreground">{contact.contact_person}</p>}
                {contact.email && <p className="text-muted-foreground">{contact.email}</p>}
                {contact.phone && <p className="text-muted-foreground">{contact.phone}</p>}
                {(contact as any).address && <p className="text-muted-foreground">{(contact as any).address}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Proposal"
        description="Are you sure you want to delete this proposal? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteProposal.isPending}
        onConfirm={() => {
          deleteProposal.mutate(id, { onSuccess: () => router.push('/proposals') })
        }}
      />
    </div>
  )
}
