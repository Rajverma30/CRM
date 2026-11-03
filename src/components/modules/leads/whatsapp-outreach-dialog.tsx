'use client'

import { useEffect, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  Check,
  Globe,
  Star,
  ExternalLink,
  Phone,
  RefreshCw,
  Target,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import {
  cleanWhatsAppNumber,
  getWhatsAppUrl,
  LeadPitchInfo,
  DEFAULT_SENDER_NUMBER,
} from '@/lib/whatsapp/utils'
import { useUpdateLead } from '@/lib/queries/use-leads'
import { toast } from 'sonner'

export interface WhatsAppDialogLead extends LeadPitchInfo {
  status?: string
}

interface WhatsAppOutreachDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: WhatsAppDialogLead | null
  initialTab?: 'message' | 'strategy'
  onSent?: (leadId?: string) => void
}

export function WhatsAppOutreachDialog({
  open,
  onOpenChange,
  lead,
  initialTab = 'message',
  onSent,
}: WhatsAppOutreachDialogProps) {
  const updateLead = useUpdateLead()
  const [activeTab, setActiveTab] = useState<'message' | 'strategy'>(initialTab)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [focus, setFocus] = useState<'website' | 'google_maps' | 'software' | 'general'>('website')
  const [language, setLanguage] = useState<'hinglish' | 'hindi' | 'english'>('hinglish')
  const [senderNumber, setSenderNumber] = useState(DEFAULT_SENDER_NUMBER)
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [markAsContacted, setMarkAsContacted] = useState(true)
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [aiModelUsed, setAiModelUsed] = useState<string | null>(null)
  const [fallbackReason, setFallbackReason] = useState<string | null>(null)

  // Approach Strategy state
  const [strategy, setStrategy] = useState('')
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false)
  const [strategyCopied, setStrategyCopied] = useState(false)
  const [strategyAiGenerated, setStrategyAiGenerated] = useState(false)

  // Sync state when dialog opens or lead changes
  useEffect(() => {
    if (lead && open) {
      setActiveTab(initialTab)
      const rawPhone = lead.phone || ''
      setPhone(rawPhone)

      const initialFocus = !lead.website ? 'website' : 'google_maps'
      setFocus(initialFocus)

      // Auto generate message on open
      handleGenerate(rawPhone, initialFocus, language)

      // Reset strategy
      setStrategy('')
    } else {
      setMessage('')
      setStrategy('')
      setCopied(false)
      setIsAiGenerated(false)
      setAiModelUsed(null)
      setFallbackReason(null)
    }
  }, [lead, open, initialTab])

  // Auto-fetch strategy when user switches to strategy tab if empty
  useEffect(() => {
    if (activeTab === 'strategy' && open && lead && !strategy && !isGeneratingStrategy) {
      handleGenerateStrategy(language)
    }
  }, [activeTab, open, lead])

  async function handleGenerate(
    targetPhone = phone,
    targetFocus = focus,
    targetLanguage = language
  ) {
    if (!lead) return
    setIsGenerating(true)
    setFallbackReason(null)
    try {
      const response = await fetch('/api/ai/whatsapp-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            ...lead,
            phone: targetPhone,
          },
          focus: targetFocus,
          language: targetLanguage,
          senderNumber,
          customPrompt: customPrompt.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()
      setMessage(data.message || '')
      setIsAiGenerated(Boolean(data.aiGenerated))
      setAiModelUsed(data.model || null)

      if (!data.aiGenerated && data.fallbackReason) {
        setFallbackReason(data.fallbackReason)
        toast.info(`Smart template used: ${data.fallbackReason}`)
      }
    } catch (err) {
      toast.error('Failed to generate message. Using fallback template.')
      setIsAiGenerated(false)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerateStrategy(targetLanguage = language) {
    if (!lead) return
    setIsGeneratingStrategy(true)
    try {
      const response = await fetch('/api/ai/approach-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead,
          language: targetLanguage,
        }),
      })

      if (!response.ok) throw new Error('Strategy API failed')
      const data = await response.json()
      setStrategy(data.strategy || '')
      setStrategyAiGenerated(Boolean(data.aiGenerated))
    } catch (err) {
      toast.error('Could not generate strategy.')
    } finally {
      setIsGeneratingStrategy(false)
    }
  }

  function handleCopy() {
    if (!message) return
    navigator.clipboard.writeText(message)
    setCopied(true)
    toast.success('Message copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyStrategy() {
    if (!strategy) return
    navigator.clipboard.writeText(strategy)
    setStrategyCopied(true)
    toast.success('Sales strategy copied!')
    setTimeout(() => setStrategyCopied(false), 2000)
  }

  function handleSend() {
    const cleanNumber = cleanWhatsAppNumber(phone)
    if (!cleanNumber) {
      toast.error('Please enter a valid phone number.')
      return
    }

    if (!message.trim()) {
      toast.error('Message cannot be empty.')
      return
    }

    // Open WhatsApp URL
    const url = getWhatsAppUrl(cleanNumber, message)
    window.open(url, '_blank', 'noopener,noreferrer')

    // Mark status as contacted if checked and lead has an ID in database
    if (markAsContacted && lead?.id) {
      updateLead.mutate(
        { id: lead.id, status: 'contacted' },
        {
          onSuccess: () => {
            toast.success('Lead marked as Contacted!')
            onSent?.(lead.id)
          },
        }
      )
    } else {
      onSent?.(lead?.id)
    }

    onOpenChange(false)
  }

  if (!lead) return null

  const cleanNumber = cleanWhatsAppNumber(phone)
  const businessTitle = lead.business_name || lead.contact_person || 'Lead'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">AI Outreach & Strategy</DialogTitle>
                <DialogDescription className="text-xs">
                  Tailored sales pitch and approach playbook for <span className="font-semibold text-foreground">{businessTitle}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {isAiGenerated ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]">
                  <Sparkles className="h-3 w-3" /> Gemini AI Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  Smart Template
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Lead Context Pill */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-2 text-xs">
          <span className="font-semibold">{businessTitle}</span>
          {lead.category && <Badge variant="outline">{lead.category}</Badge>}
          {lead.rating && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {lead.rating} ({lead.reviews ?? 0})
            </span>
          )}
          {lead.website ? (
            <span className="flex items-center gap-1 text-blue-600 truncate max-w-[200px]">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.website}</span>
            </span>
          ) : (
            <span className="text-amber-600 font-medium">⚠️ No Website</span>
          )}
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="message" className="text-xs gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp Message
            </TabsTrigger>
            <TabsTrigger value="strategy" className="text-xs gap-1.5">
              <Target className="h-3.5 w-3.5 text-indigo-500" />
              How to Grab this Client (Strategy)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: WHATSAPP MESSAGE */}
          <TabsContent value="message" className="space-y-3 pt-2">
            {/* Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs">Recipient Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="pl-8 text-xs font-mono h-8"
                  />
                </div>
                {cleanNumber && (
                  <p className="text-[10px] text-muted-foreground">
                    Format: <span className="font-mono text-emerald-600 font-medium">+{cleanNumber}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Pitch Focus</Label>
                <Select
                  value={focus}
                  onValueChange={v => {
                    const val = v as any
                    setFocus(val)
                    handleGenerate(phone, val, language)
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Focus" />
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
                <Label className="text-xs">Language</Label>
                <Select
                  value={language}
                  onValueChange={v => {
                    const val = v as any
                    setLanguage(val)
                    handleGenerate(phone, focus, val)
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hinglish">Hinglish (Conversational)</SelectItem>
                    <SelectItem value="hindi">Hindi (Shuddh)</SelectItem>
                    <SelectItem value="english">English (Professional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Regenerate Button & Sender Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] text-muted-foreground font-mono">
                Sender: <strong className="text-foreground">+{senderNumber}</strong>
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGenerating}
                onClick={() => handleGenerate(phone, focus, language)}
                className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Gemini Generating...' : 'Regenerate Pitch'}
              </Button>
            </div>

            {/* Message Area */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">WhatsApp Message</Label>
                <span className="text-[10px] text-muted-foreground">
                  {message.length} chars • Fully editable
                </span>
              </div>

              {isGenerating ? (
                <div className="h-32 flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 text-xs text-muted-foreground gap-2">
                  <Sparkles className="h-5 w-5 animate-pulse text-emerald-500" />
                  <span>Gemini AI is crafting a tailored pitch for {businessTitle}...</span>
                </div>
              ) : (
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={6}
                  className="text-xs leading-relaxed font-sans bg-background"
                  placeholder="Type or generate message..."
                />
              )}
            </div>

            {/* WhatsApp Bubble Preview */}
            <div className="rounded-lg bg-[#efeae2] dark:bg-[#0b141a] p-2.5 border">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">
                Live WhatsApp Preview
              </p>
              <div className="max-w-[85%] rounded-lg rounded-tl-none bg-[#d9fdd3] dark:bg-[#005c4b] p-2 text-xs text-gray-900 dark:text-gray-100 shadow-sm whitespace-pre-wrap leading-relaxed">
                {message || (isGenerating ? 'Generating...' : 'No message yet.')}
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-gray-500 dark:text-gray-300">
                  <span>Just now</span>
                  <span>✓✓</span>
                </div>
              </div>
            </div>

            {/* Status auto-update option */}
            {lead.id && (
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="markContacted"
                  checked={markAsContacted}
                  onCheckedChange={checked => setMarkAsContacted(Boolean(checked))}
                />
                <label
                  htmlFor="markContacted"
                  className="text-xs font-medium leading-none cursor-pointer text-muted-foreground"
                >
                  Mark lead status as <span className="text-foreground font-semibold">Contacted</span> after opening WhatsApp
                </label>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: HOW TO GRAB THIS CLIENT (APPROACH STRATEGY) */}
          <TabsContent value="strategy" className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>AI-powered sales playbook on how to pitch, handle objections, and close {businessTitle}.</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGeneratingStrategy}
                onClick={() => handleGenerateStrategy(language)}
                className="h-7 text-xs text-indigo-600 border-indigo-300 hover:bg-indigo-50 gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${isGeneratingStrategy ? 'animate-spin' : ''}`} />
                {isGeneratingStrategy ? 'Analyzing...' : 'Refresh Strategy'}
              </Button>
            </div>

            {/* Strategy Content Box */}
            <div className="min-h-[240px] max-h-[360px] overflow-y-auto rounded-lg border bg-card p-3.5 text-xs leading-relaxed">
              {isGeneratingStrategy ? (
                <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2.5">
                  <Sparkles className="h-6 w-6 animate-spin text-indigo-500" />
                  <p className="font-medium text-foreground">Gemini AI is analyzing {businessTitle}...</p>
                  <p className="text-[11px] text-muted-foreground text-center max-w-sm">
                    Checking Google rating, reviews, website gaps, and writing cold call hooks & objection handlers.
                  </p>
                </div>
              ) : strategy ? (
                <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-xs">
                  {strategy}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2">
                  <Target className="h-8 w-8 text-muted-foreground/40" />
                  <p>Click below to generate a tailored client acquisition strategy.</p>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateStrategy(language)}
                    className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Generate Approach Strategy
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Use this cheat sheet during calls or meetings to close the deal.</span>
              {strategy && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyStrategy}
                  className="h-7 text-xs gap-1"
                >
                  {strategyCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {strategyCopied ? 'Copied' : 'Copy Strategy'}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={activeTab === 'message' ? handleCopy : handleCopyStrategy}
            className="w-full sm:w-auto gap-1.5 text-xs"
          >
            {copied || strategyCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {activeTab === 'message'
              ? copied
                ? 'Copied Message'
                : 'Copy Text'
              : strategyCopied
              ? 'Copied Strategy'
              : 'Copy Strategy'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs"
            >
              Close
            </Button>
            {activeTab === 'message' ? (
              <Button
                type="button"
                onClick={handleSend}
                disabled={!cleanNumber}
                className="w-full sm:w-auto gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-xs shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                Send on WhatsApp
                <ExternalLink className="h-3 w-3 opacity-70 ml-0.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setActiveTab('message')}
                className="w-full sm:w-auto gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-xs"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Go to WhatsApp Pitch
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
