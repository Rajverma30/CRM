import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a professional proposal/quotation generator for a tech company called Vraizen Tech. Given a prompt describing a project, generate a structured proposal in JSON format.

Return ONLY valid JSON with this structure:
{
  "title": "Project title",
  "scope": "Brief scope description",
  "features": ["Feature 1", "Feature 2"],
  "timeline": "Estimated timeline (e.g., '4-6 weeks')",
  "items": [
    { "service": "Service name", "description": "What this covers", "quantity": 1, "unitPrice": 5000 }
  ],
  "terms": "Standard terms and conditions text",
  "description": "Detailed project description"
}

Make the proposal professional and detailed. Prices should be in INR. Break the project into logical service line items.`

function generateFallback(prompt: string, clientName?: string): {
  title: string
  scope: string
  features: string[]
  timeline: string
  items: Array<{ service: string; description: string; quantity: number; unitPrice: number }>
  terms: string
  description: string
} {
  const amountMatch = prompt.match(/₹\s?([\d,]+)|(\d[\d,]*)\s*(?:rs|inr|rupees)/i)
  const totalAmount = amountMatch
    ? parseInt((amountMatch[1] || amountMatch[2]).replace(/,/g, ''), 10)
    : 25000

  const pageMatch = prompt.match(/(\d+)\s*(?:-\s*\d+\s*)?page/i)
  const pages = pageMatch ? parseInt(pageMatch[1], 10) : 5

  const projectType = prompt.toLowerCase().includes('website')
    ? 'Website'
    : prompt.toLowerCase().includes('app')
      ? 'Application'
      : 'Project'

  const designPrice = Math.round(totalAmount * 0.3)
  const devPrice = Math.round(totalAmount * 0.5)
  const testPrice = Math.round(totalAmount * 0.2)

  return {
    title: `${projectType} Development${clientName ? ` for ${clientName}` : ''}`,
    scope: `Professional ${pages}-page ${projectType.toLowerCase()} development with modern design and responsive layout.`,
    features: [
      'Responsive design for all devices',
      'SEO optimized structure',
      'Contact form integration',
      'Performance optimization',
      'Cross-browser compatibility',
    ],
    timeline: pages <= 5 ? '2-3 weeks' : '4-6 weeks',
    items: [
      { service: 'UI/UX Design', description: `${pages}-page design with modern aesthetics`, quantity: pages, unitPrice: Math.round(designPrice / pages) },
      { service: 'Development', description: `Frontend and backend development`, quantity: 1, unitPrice: devPrice },
      { service: 'Testing & Deployment', description: 'Quality assurance and production deployment', quantity: 1, unitPrice: testPrice },
    ],
    terms: `1. 50% advance payment required before project initiation.\n2. Remaining 50% due upon project completion.\n3. Proposal valid for 30 days from the date of issue.\n4. Includes 30 days of free support post-launch.\n5. Any additional features/pages will be quoted separately.\n6. Content (text & images) to be provided by the client.`,
    description: `Complete ${projectType.toLowerCase()} development solution including design, development, testing, and deployment.`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, clientName, industry } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const aiProvider = process.env.AI_PROVIDER
    const openaiKey = process.env.OPENAI_API_KEY

    if (aiProvider === 'openai' && openaiKey) {
      const userPrompt = `Generate a proposal for: ${prompt}${clientName ? `\nClient: ${clientName}` : ''}${industry ? `\nIndustry: ${industry}` : ''}`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || 'OpenAI API error')
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('No response from AI')

      return NextResponse.json(JSON.parse(content))
    }

    return NextResponse.json(generateFallback(prompt, clientName))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
