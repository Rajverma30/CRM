'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { generateProposal, type AIProposalOutput } from '@/lib/ai'
import { toast } from 'sonner'

interface AIProposalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: (data: AIProposalOutput) => void
}

export function AIProposalDialog({ open, onOpenChange, onGenerated }: AIProposalDialogProps) {
  const [prompt, setPrompt] = useState('')
  const [clientName, setClientName] = useState('')
  const [industry, setIndustry] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setLoading(true)
    try {
      const result = await generateProposal({
        prompt: prompt.trim(),
        clientName: clientName.trim() || undefined,
        industry: industry.trim() || undefined,
      })
      onGenerated(result)
      onOpenChange(false)
      setPrompt('')
      setClientName('')
      setIndustry('')
      toast.success('Proposal generated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate proposal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Proposal Generator
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </DialogTitle>
          <DialogDescription>
            Describe the project and let AI generate a proposal for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">Project Description *</Label>
            <Textarea
              id="ai-prompt"
              placeholder='e.g., "Create a quotation for a 6-page dental clinic website for ₹14,999"'
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ai-client">Client Name</Label>
              <Input
                id="ai-client"
                placeholder="Optional"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-industry">Industry</Label>
              <Input
                id="ai-industry"
                placeholder="Optional"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
