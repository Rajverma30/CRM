'use client'

import { useState, useEffect, useMemo, useCallback, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, X, Sparkles, ArrowLeft, Save, Send, Eye, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth/auth-context'
import { useClients } from '@/lib/queries/use-clients'
import { useCreateProposal, useUpdateProposal, useProposal } from '@/lib/queries/use-proposals'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { AIProposalDialog } from '@/components/modules/proposals/ai-proposal-dialog'
import { ProposalPDF, downloadPDF } from '@/components/modules/proposals/proposal-pdf'
import { type AIProposalOutput } from '@/lib/ai'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

interface LineItem {
  service: string
  description: string
  quantity: number
  unitPrice: number
}

function useLeads(tenantId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['leads', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, business_name')
        .eq('tenant_id', tenantId!)
        .order('business_name')
      if (error) throw error
      return data as Array<{ id: string; business_name: string }>
    },
    enabled: !!tenantId,
  })
}

function useTenantSettings(tenantId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('proposal_terms')
        .eq('id', tenantId!)
        .single()
      if (error) throw error
      return data as { proposal_terms: string | null }
    },
    enabled: !!tenantId,
  })
}

function generateProposalNumber(): string {
  const year = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `VT-${year}-${seq}`
}

export default function NewProposalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAdmin, profile } = useAuth()

  const editId = searchParams.get('edit')
  const duplicateId = searchParams.get('duplicate')
  const loadId = editId || duplicateId

  const { data: existingProposal, isLoading: loadingExisting } = useProposal(loadId || undefined)
  const { data: clients = [] } = useClients()
  const { data: leads = [] } = useLeads(profile?.tenant_id)
  const { data: tenantSettings } = useTenantSettings(profile?.tenant_id)
  const createProposal = useCreateProposal()
  const updateProposal = useUpdateProposal()

  const [proposalNumber, setProposalNumber] = useState(generateProposalNumber())
  const [clientId, setClientId] = useState<string>('')
  const [leadId, setLeadId] = useState<string>('')
  const [validUntil, setValidUntil] = useState('')
  const [timeline, setTimeline] = useState('')
  const [terms, setTerms] = useState('')
  const [status, setStatus] = useState('draft')
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(18)
  const [items, setItems] = useState<LineItem[]>([{ service: '', description: '', quantity: 1, unitPrice: 0 }])
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (tenantSettings?.proposal_terms && !terms && !loadId) {
      setTerms(tenantSettings.proposal_terms)
    }
  }, [tenantSettings, terms, loadId])

  useEffect(() => {
    if (existingProposal && !initialized) {
      if (editId) {
        setProposalNumber(existingProposal.proposal_number)
      } else {
        setProposalNumber(generateProposalNumber())
      }
      setClientId(existingProposal.client_id || '')
      setLeadId(existingProposal.lead_id || '')
      setValidUntil(existingProposal.valid_until || '')
      setTimeline(existingProposal.timeline || '')
      setTerms(existingProposal.terms || '')
      setStatus(existingProposal.status)
      setDiscount(existingProposal.discount)
      setTax(existingProposal.tax)
      setItems(
        existingProposal.proposal_items.map(item => ({
          service: item.service,
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unit_price,
        }))
      )
      setInitialized(true)
    }
  }, [existingProposal, initialized, editId])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items])
  const taxableAmount = subtotal - discount
  const taxAmount = taxableAmount * (tax / 100)
  const grandTotal = taxableAmount + taxAmount

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems(prev => [...prev, { service: '', description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function handleAIGenerated(data: AIProposalOutput) {
    setTimeline(data.timeline)
    setTerms(data.terms)
    setItems(data.items.map(item => ({
      service: item.service,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })))
    setAiGenerated(true)
  }

  const handleSave = useCallback(async (sendStatus?: string) => {
    if (!proposalNumber.trim()) {
      toast.error('Proposal number is required')
      return
    }

    const validItems = items.filter(item => item.service.trim())
    if (validItems.length === 0) {
      toast.error('At least one line item is required')
      return
    }

    const finalStatus = sendStatus || status
    const payload = {
      proposal_number: proposalNumber,
      client_id: clientId || null,
      lead_id: leadId || null,
      valid_until: validUntil || null,
      timeline: timeline || null,
      terms: terms || null,
      status: finalStatus,
      discount,
      tax,
      total: grandTotal,
      items: validItems.map(item => ({
        service: item.service,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
    }

    if (editId) {
      updateProposal.mutate({ id: editId, ...payload }, {
        onSuccess: () => router.push(`/proposals/${editId}`),
      })
    } else {
      createProposal.mutate(payload, {
        onSuccess: (data) => router.push(`/proposals/${data.id}`),
      })
    }
  }, [proposalNumber, clientId, leadId, validUntil, timeline, terms, status, discount, tax, grandTotal, items, editId, createProposal, updateProposal, router])

  if (!isAdmin) {
    router.push('/proposals')
    return null
  }

  if (loadId && loadingExisting) return <LoadingSpinner />

  const previewProposal = showPreview ? {
    id: editId || 'preview',
    tenant_id: profile?.tenant_id || '',
    client_id: clientId || null,
    lead_id: leadId || null,
    proposal_number: proposalNumber,
    valid_until: validUntil || null,
    timeline: timeline || null,
    terms: terms || null,
    status: status as 'draft',
    discount,
    tax,
    total: grandTotal,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    client: clientId ? (clients.find(c => c.id === clientId) ? {
      id: clientId,
      business_name: clients.find(c => c.id === clientId)!.business_name,
      contact_person: clients.find(c => c.id === clientId)!.contact_person,
      email: clients.find(c => c.id === clientId)!.email,
      phone: clients.find(c => c.id === clientId)!.phone,
      address: clients.find(c => c.id === clientId)!.address,
    } : null) : null,
    lead: leadId ? (leads.find(l => l.id === leadId) ? {
      id: leadId,
      business_name: leads.find(l => l.id === leadId)!.business_name,
      contact_person: null,
      email: null,
      phone: null,
    } : null) : null,
    proposal_items: items.filter(i => i.service.trim()).map((item, idx) => ({
      id: String(idx),
      proposal_id: editId || 'preview',
      service: item.service,
      description: item.description || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice,
    })),
  } : null

  const isSaving = createProposal.isPending || updateProposal.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/proposals')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <PageHeader title={editId ? 'Edit Proposal' : 'New Proposal'}>
          <div className="flex items-center gap-2">
            {aiGenerated && <Badge variant="secondary"><Sparkles className="mr-1 h-3 w-3" /> AI Generated</Badge>}
            <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" /> AI Generate
            </Button>
          </div>
        </PageHeader>
      </div>

      {showPreview && previewProposal ? (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>Back to Editor</Button>
            <Button onClick={() => downloadPDF()}>Download PDF</Button>
          </div>
          <div className="border rounded-lg overflow-hidden print:border-none">
            <ProposalPDF proposal={previewProposal} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form Fields */}
            <Card>
              <CardHeader><CardTitle>Proposal Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proposal-number">Proposal Number</Label>
                  <Input id="proposal-number" value={proposalNumber} onChange={e => setProposalNumber(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={clientId || '_none'} onValueChange={v => { setClientId(v === '_none' ? '' : v); if (v !== '_none') setLeadId('') }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead">Lead</Label>
                  <Select value={leadId || '_none'} onValueChange={v => { setLeadId(v === '_none' ? '' : v); if (v !== '_none') setClientId('') }} disabled={!!clientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {leads.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.business_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clientId && <p className="text-xs text-muted-foreground">Disabled when a client is selected</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid-until">Valid Until</Label>
                  <Input id="valid-until" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Input id="timeline" value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g., 4-6 weeks" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea id="terms" value={terms} onChange={e => setTerms(e.target.value)} rows={5} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
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
                </div>
              </CardContent>
            </Card>

            {/* Right: Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Line Items</CardTitle>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-1 h-4 w-4" /> Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="space-y-3 p-3 border rounded-lg relative">
                    {items.length > 1 && (
                      <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-7 w-7 p-0" onClick={() => removeItem(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="space-y-2">
                      <Label>Service</Label>
                      <Input value={item.service} onChange={e => updateItem(idx, 'service', e.target.value)} placeholder="Service name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Brief description" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Qty</Label>
                        <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price</Label>
                        <Input type="number" min={0} value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Line Total</Label>
                        <Input readOnly value={formatCurrency(item.quantity * item.unitPrice)} className="bg-muted" />
                      </div>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Discount (₹)</Label>
                    <Input type="number" min={0} value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-32" />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Tax (%)</Label>
                    <Input type="number" min={0} max={100} value={tax} onChange={e => setTax(parseFloat(e.target.value) || 0)} className="w-32" />
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save as Draft
            </Button>
            <Button onClick={() => handleSave('sent')} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Save & Send
            </Button>
          </div>
        </>
      )}

      <AIProposalDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} onGenerated={handleAIGenerated} />
    </div>
  )
}
