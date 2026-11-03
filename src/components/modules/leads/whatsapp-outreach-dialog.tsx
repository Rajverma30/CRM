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
  onSent?: (leadId?: string) => void
}

export function WhatsAppOutreachDialog({
  open,
  onOpenChange,
  lead,
  onSent,
}: WhatsAppOutreachDialogProps) {
  const updateLead = useUpdateLead()
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

  // Sync state when dialog opens or lead changes
  useEffect(() => {
    if (lead && open) {
      const rawPhone = lead.phone || ''
      setPhone(rawPhone)

      // Auto-choose focus based on whether lead already has website
      if (!lead.website) {
        setFocus('website')
      } else {
        setFocus('google_maps')
      }

      // Generate initial message
      handleGenerate(rawPhone, !lead.website ? 'website' : 'google_maps', language)
    } else {
      setMessage('')
      setCopied(false)
      setIsAiGenerated(false)
    }
  }, [lead, open])

  async function handleGenerate(
    targetPhone = phone,
    targetFocus = focus,
    targetLanguage = language
  ) {
    if (!lead) return
    setIsGenerating(true)
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
        throw new Error('Failed to generate message')
      }

      const data = await response.json()
      setMessage(data.message || '')
      setIsAiGenerated(Boolean(data.aiGenerated))
    } catch (err) {
      toast.error('Could not generate message with AI. Using default template.')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleCopy() {
    if (!message) return
    navigator.clipboard.writeText(message)
    setCopied(true)
    toast.success('Message copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Send WhatsApp Message</DialogTitle>
                <DialogDescription className="text-xs">
                  Personalized outreach message tailored to {businessTitle}
                </DialogDescription>
              </div>
            </div>
            {isAiGenerated ? (
              <Badge className="bg-emerald-600 text-white gap-1 text-[11px]">
                <Sparkles className="h-3 w-3" /> Gemini AI
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                Smart Template
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Lead Context Badges */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-2.5 text-xs">
          <span className="font-semibold">{businessTitle}</span>
          {lead.category && <Badge variant="outline">{lead.category}</Badge>}
          {lead.rating && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {lead.rating}
            </span>
          )}
          {lead.website ? (
            <span className="flex items-center gap-1 text-blue-600">
              <Globe className="h-3 w-3" /> Has Website
            </span>
          ) : (
            <span className="text-amber-600 font-medium">⚠️ No Website</span>
          )}
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs">Recipient Phone</Label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="pl-8 text-xs font-mono"
              />
            </div>
            {cleanNumber && (
              <p className="text-[10px] text-muted-foreground">
                WhatsApp: <span className="font-mono text-emerald-600 font-medium">+{cleanNumber}</span>
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
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website Pitch</SelectItem>
                <SelectItem value="google_maps">Google Maps / SEO</SelectItem>
                <SelectItem value="software">Custom CRM / Tech</SelectItem>
                <SelectItem value="general">General Outreach</SelectItem>
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
              <SelectTrigger className="text-xs">
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

        {/* Sender and Custom Instruction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sender Contact Number</Label>
            <Input
              value={senderNumber}
              onChange={e => setSenderNumber(e.target.value)}
              placeholder="8602558138"
              className="text-xs font-mono"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isGenerating}
              onClick={() => handleGenerate(phone, focus, language)}
              className="w-full gap-1.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating with Gemini...' : 'Regenerate Message'}
            </Button>
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">WhatsApp Message</Label>
            <span className="text-[10px] text-muted-foreground">
              {message.length} chars • You can edit freely before sending
            </span>
          </div>

          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={8}
            className="text-xs leading-relaxed font-sans bg-background"
            placeholder="Type or generate your WhatsApp pitch message..."
          />
        </div>

        {/* Live WhatsApp Bubble Preview */}
        <div className="rounded-lg bg-[#efeae2] dark:bg-[#0b141a] p-3 border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
            WhatsApp Preview
          </p>
          <div className="max-w-[85%] rounded-lg rounded-tl-none bg-[#d9fdd3] dark:bg-[#005c4b] p-2.5 text-xs text-gray-900 dark:text-gray-100 shadow-sm whitespace-pre-wrap leading-relaxed">
            {message || 'Generating message preview...'}
            <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-gray-500 dark:text-gray-300">
              <span>Just now</span>
              <span>✓✓</span>
            </div>
          </div>
        </div>

        {/* Mark as contacted checkbox */}
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
              Automatically update lead status to <span className="text-foreground font-semibold">Contacted</span> after opening WhatsApp
            </label>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="w-full sm:w-auto gap-1.5 text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy Text'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

