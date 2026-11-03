'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  SkipForward,
  CheckCircle2,
  ListOrdered,
  RefreshCw,
} from 'lucide-react'
import {
  cleanWhatsAppNumber,
  getWhatsAppUrl,
  DEFAULT_SENDER_NUMBER,
  LeadPitchInfo,
  generateSmartWhatsAppMessage,
} from '@/lib/whatsapp/utils'
import { useUpdateLead } from '@/lib/queries/use-leads'
import { toast } from 'sonner'

export interface BulkLeadItem extends LeadPitchInfo {
  status?: string
}

interface BulkWhatsAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leads: BulkLeadItem[]
  onComplete?: () => void
}

interface QueueItem {
  lead: BulkLeadItem
  phone: string
  message: string
  state: 'pending' | 'sent' | 'skipped'
  aiGenerated: boolean
}

export function BulkWhatsAppDialog({
  open,
  onOpenChange,
  leads,
  onComplete,
}: BulkWhatsAppDialogProps) {
  const updateLead = useUpdateLead()
  const [focus, setFocus] = useState<'website' | 'google_maps' | 'software' | 'general'>('website')
  const [language, setLanguage] = useState<'hinglish' | 'hindi' | 'english'>('hinglish')
  const [senderNumber, setSenderNumber] = useState(DEFAULT_SENDER_NUMBER)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  // Filter leads with phone numbers
  const validLeads = useMemo(() => {
    return leads.filter(l => cleanWhatsAppNumber(l.phone).length >= 10)
  }, [leads])

  // Queue state holding messages and sent state for each lead
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    return validLeads.map(lead => ({
      lead,
      phone: lead.phone || '',
      message: generateSmartWhatsAppMessage(lead, {
        focus: !lead.website ? 'website' : 'google_maps',
        language: 'hinglish',
        senderNumber: DEFAULT_SENDER_NUMBER,
      }),
      state: 'pending',
      aiGenerated: false,
    }))
  })

  // Whenever valid leads change or dialog opens with new leads, reset queue
  useEffect(() => {
    if (open && validLeads.length > 0) {
      setQueue(
        validLeads.map(lead => ({
          lead,
          phone: lead.phone || '',
          message: generateSmartWhatsAppMessage(lead, {
            focus: !lead.website ? 'website' : 'google_maps',
            language,
            senderNumber,
          }),
          state: 'pending',
          aiGenerated: false,
        }))
      )
      setCurrentIndex(0)
    }
  }, [open, validLeads, language, senderNumber])

  const currentItem = queue[currentIndex]
  const sentCount = queue.filter(q => q.state === 'sent').length
  const totalCount = queue.length

  // Generate All with Gemini AI
  async function handleGenerateAll() {
    if (queue.length === 0) return
    setIsGeneratingAll(true)
    try {
      const response = await fetch('/api/ai/whatsapp-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: queue.map(q => q.lead),
          focus,
          language,
          senderNumber,
        }),
      })

      if (!response.ok) {
        throw new Error('AI generation failed')
      }

      const data = await response.json()
      if (data.messages && Array.isArray(data.messages)) {
        const msgMap = new Map<string, string>()
        data.messages.forEach((m: any) => {
          if (m.id && m.message) msgMap.set(String(m.id), m.message)
          if (m.business_name && m.message) msgMap.set(String(m.business_name), m.message)
        })

        setQueue(prev =>
          prev.map(item => {
            const aiMsg =
              msgMap.get(item.lead.id || '') ||
              msgMap.get(item.lead.business_name || '')
            return {
              ...item,
              message: aiMsg || item.message,
              aiGenerated: Boolean(data.aiGenerated),
            }
          })
        )
        toast.success(`Generated personalized pitches for ${queue.length} leads!`)
      }
    } catch (err) {
      toast.error('AI generation had an issue. Using smart templates.')
    } finally {
      setIsGeneratingAll(false)
    }
  }

  function updateCurrentMessage(text: string) {
    setQueue(prev => {
      const copy = [...prev]
      if (copy[currentIndex]) {
        copy[currentIndex] = { ...copy[currentIndex], message: text }
      }
      return copy
    })
  }

  function handleSendCurrent() {
    if (!currentItem) return
    const cleanNumber = cleanWhatsAppNumber(currentItem.phone)
    if (!cleanNumber) {
      toast.error('Invalid phone number for this lead.')
      return
    }

    // Open WhatsApp URL
    const url = getWhatsAppUrl(cleanNumber, currentItem.message)
    window.open(url, '_blank', 'noopener,noreferrer')

    // Mark current item as sent
    setQueue(prev => {
      const copy = [...prev]
      if (copy[currentIndex]) {
        copy[currentIndex] = { ...copy[currentIndex], state: 'sent' }
      }
      return copy
    })

    // Update lead in database if ID exists
    if (currentItem.lead.id) {
      updateLead.mutate({ id: currentItem.lead.id, status: 'contacted' })
    }

    // Advance to next lead if available
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      toast.success('Reached the end of the queue!')
      onComplete?.()
    }
  }

  function handleSkipCurrent() {
    setQueue(prev => {
      const copy = [...prev]
      if (copy[currentIndex]) {
        copy[currentIndex] = { ...copy[currentIndex], state: 'skipped' }
      }
      return copy
    })
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  function handleCopyCurrent() {
    if (!currentItem) return
    navigator.clipboard.writeText(currentItem.message)
    setCopied(true)
    toast.success('Message copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (queue.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk WhatsApp Outreach</DialogTitle>
            <DialogDescription>
              No valid phone numbers found in the selected leads.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Please make sure the leads have contact phone numbers with at least 10 digits.
          </p>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const currentLead = currentItem.lead
  const cleanPhone = cleanWhatsAppNumber(currentItem.phone)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Bulk WhatsApp Outreach</DialogTitle>
                <DialogDescription className="text-xs">
                  Dispatch personalized pitches one-by-one from <span className="font-semibold text-emerald-600 font-mono">+{senderNumber}</span>
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-xs py-1 px-2.5 self-start sm:self-auto">
              Sent: {sentCount} / {totalCount} leads
            </Badge>
          </div>
        </DialogHeader>

        {/* Global Controls & Batch AI Generation */}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Pitch Focus</Label>
              <Select value={focus} onValueChange={(v: any) => setFocus(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website Pitch</SelectItem>
                  <SelectItem value="google_maps">Google Maps / SEO</SelectItem>
                  <SelectItem value="software">Custom CRM / Tech</SelectItem>
                  <SelectItem value="general">General Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Language</Label>
              <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hinglish">Hinglish</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Sender Number</Label>
              <Input
                value={senderNumber}
                onChange={e => setSenderNumber(e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder="8602558138"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isGeneratingAll}
                onClick={handleGenerateAll}
                className="h-8 w-full gap-1.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isGeneratingAll ? 'animate-spin' : ''}`} />
                {isGeneratingAll ? 'Generating...' : 'AI Generate All'}
              </Button>
            </div>
          </div>
        </div>

        {/* Queue Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              Queue Lead {currentIndex + 1} of {totalCount}:{' '}
              <strong className="text-foreground">{currentLead.business_name}</strong>
            </span>
            <span>{Math.round((sentCount / totalCount) * 100)}% Completed</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(sentCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Lead Card */}
        <div className="rounded-lg border p-3.5 space-y-3 bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{currentLead.business_name}</span>
              {currentLead.category && <Badge variant="secondary">{currentLead.category}</Badge>}
              {currentLead.website ? (
                <span className="flex items-center gap-1 text-[11px] text-blue-600">
                  <Globe className="h-3 w-3" /> Website exists
                </span>
              ) : (
                <span className="text-[11px] text-amber-600 font-medium">⚠️ No Website</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-mono">+{cleanPhone}</span>
              {currentItem.state === 'sent' && (
                <Badge className="bg-emerald-600 text-white gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Sent
                </Badge>
              )}
              {currentItem.state === 'skipped' && (
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                  Skipped
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Message for {currentLead.business_name}:</span>
              <span>{currentItem.message.length} chars</span>
            </div>
            <Textarea
              value={currentItem.message}
              onChange={e => updateCurrentMessage(e.target.value)}
              rows={7}
              className="text-xs leading-relaxed font-sans"
            />
          </div>

          {/* Step Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="h-8 text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSkipCurrent}
                className="h-8 text-xs gap-1 text-muted-foreground"
              >
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyCurrent}
                className="h-8 text-xs gap-1"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                Copy
              </Button>

              <Button
                size="sm"
                onClick={handleSendCurrent}
                className="h-8 gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-medium shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                Send & Next
                <ExternalLink className="h-3 w-3 opacity-70 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Queue Navigator Chips */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Jump to lead:</Label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border rounded-md bg-muted/20">
            {queue.map((item, idx) => (
              <button
                key={item.lead.id || item.lead.business_name || idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                  idx === currentIndex
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : item.state === 'sent'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {item.state === 'sent' && <Check className="h-2.5 w-2.5" />}
                <span className="truncate max-w-[120px]">{item.lead.business_name || `Lead #${idx + 1}`}</span>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Done / Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

