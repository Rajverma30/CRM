export interface AIProposalInput {
  prompt: string
  clientName?: string
  industry?: string
}

export interface AIProposalOutput {
  title: string
  scope: string
  features: string[]
  timeline: string
  items: Array<{ service: string; description: string; quantity: number; unitPrice: number }>
  terms: string
  description: string
}

export async function generateProposal(input: AIProposalInput): Promise<AIProposalOutput> {
  const res = await fetch('/api/ai/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate proposal' }))
    throw new Error(error.error || 'Failed to generate proposal')
  }

  return res.json()
}
