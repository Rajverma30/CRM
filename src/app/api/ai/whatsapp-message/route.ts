import { NextRequest, NextResponse } from 'next/server'
import {
  generateSmartWhatsAppMessage,
  LeadPitchInfo,
  PitchOptions,
  DEFAULT_SENDER_NUMBER,
} from '@/lib/whatsapp/utils'

interface GenerateRequest {
  lead?: LeadPitchInfo
  leads?: LeadPitchInfo[]
  focus?: PitchOptions['focus']
  language?: PitchOptions['language']
  customPrompt?: string
  senderNumber?: string
}

async function callGemini(apiKey: string, prompt: string): Promise<{ text: string; model: string }> {
  // Use gemini-3.5-flash-lite first (fastest, 1-2 sec response), followed by flash
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ]
  let lastError: Error | null = null

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData?.error?.message || `Gemini API returned status ${response.status}`
        throw new Error(errorMsg)
      }

      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return { text: text.trim(), model }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // Continue to next model
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini')
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { lead, leads, focus = 'website', language = 'hinglish', customPrompt, senderNumber } = body
    const rawKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || ''
    const geminiKey = rawKey.trim()
    const sender = senderNumber || DEFAULT_SENDER_NUMBER

    const pitchOptions: PitchOptions = {
      focus,
      language,
      senderNumber: sender,
    }

    // Single lead generation
    if (lead) {
      if (geminiKey) {
        try {
          const prompt = `You are an elite B2B sales copywriter for Vraizen Tech (a high-growth digital marketing & software agency).
Our sender WhatsApp number: ${sender}.

Write a personalized, polite, and high-converting WhatsApp outreach message for this business:
Business Name: ${lead.business_name || 'Business'}
Contact Person: ${lead.contact_person || 'Owner'}
Category/Industry: ${lead.category || lead.industry || 'Local Business'}
Website: ${lead.website ? lead.website : 'No website currently (Important opportunity)'}
Google Rating: ${lead.rating ? `${lead.rating} stars (${lead.reviews ?? 0} reviews)` : 'Not specified'}
Location: ${lead.city || lead.address || 'Local area'}

Pitch Focus: ${focus}
Language: ${language} (if hinglish: friendly, respectful, modern conversational Indian Hinglish with appropriate emojis; if hindi: professional polite Hindi; if english: clean modern English).
${customPrompt ? `Special instructions: ${customPrompt}` : ''}

CRITICAL RULES:
1. Address the business owner with respect. Mention their business name (*${lead.business_name || 'your business'}*) in the opening.
2. Highlight a clear value proposition:
   - If no website: explain how 70%+ local customers search online first and a modern website + Google presence will double their inquiries.
   - If website exists: explain how local SEO/Google Maps ranking & WhatsApp automation will bring high-ticket direct leads.
3. Keep it crisp, readable on phone screens (3-4 short paragraphs max, not a giant wall of text).
4. End with a polite, low-pressure Call To Action (e.g. "Kya hum is week 5-minute call ya WhatsApp par discuss kar sakte hain ek free demo ke liye?").
5. Sign off:
Regards,
Vraizen Tech
WhatsApp: ${sender}
6. Output ONLY the message text without quotes or markdown codeblocks.`

          const { text: generatedMessage, model } = await callGemini(geminiKey, prompt)
          return NextResponse.json({
            message: generatedMessage,
            aiGenerated: true,
            provider: 'gemini',
            model,
          })
        } catch (geminiError) {
          console.error('Gemini generation failed:', geminiError)
          const fallback = generateSmartWhatsAppMessage(lead, pitchOptions)
          return NextResponse.json({
            message: fallback,
            aiGenerated: false,
            fallbackReason: geminiError instanceof Error ? geminiError.message : 'Gemini error',
          })
        }
      }

      // No key configured
      const fallback = generateSmartWhatsAppMessage(lead, pitchOptions)
      return NextResponse.json({
        message: fallback,
        aiGenerated: false,
        note: 'GEMINI_API_KEY is not configured in .env',
      })
    }

    // Batch/Bulk leads generation
    if (leads && Array.isArray(leads) && leads.length > 0) {
      if (geminiKey) {
        try {
          const prompt = `You are a B2B sales copywriter for Vraizen Tech.
Sender WhatsApp Number: ${sender}.
Pitch Focus: ${focus}.
Language: ${language}.
${customPrompt ? `Additional note: ${customPrompt}` : ''}

Generate personalized WhatsApp outreach messages for each of these leads.
Return a valid JSON object strictly matching this schema:
{
  "messages": [
    {
      "id": "<id of lead>",
      "business_name": "<business name>",
      "message": "<the full personalized whatsapp message ready to send>"
    }
  ]
}

Guidelines:
- Tailored to each business name and category.
- Mention our agency Vraizen Tech and sender number ${sender}.
- Polite, high-converting, 3-4 short paragraphs with emojis.

Leads:
${JSON.stringify(
  leads.map(l => ({
    id: l.id || l.business_name,
    business_name: l.business_name,
    contact_person: l.contact_person,
    category: l.category || l.industry,
    website: l.website,
    rating: l.rating,
  }))
)}`

          const { text: rawJson, model } = await callGemini(geminiKey, prompt)
          const cleanedJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
          const parsed = JSON.parse(cleanedJson)

          return NextResponse.json({
            messages: parsed.messages || [],
            aiGenerated: true,
            provider: 'gemini',
            model,
          })
        } catch (err) {
          console.error('Bulk Gemini generation failed:', err)
        }
      }

      // Fallback for batch
      const messages = leads.map(l => ({
        id: l.id || l.business_name,
        business_name: l.business_name,
        message: generateSmartWhatsAppMessage(l, pitchOptions),
      }))

      return NextResponse.json({
        messages,
        aiGenerated: false,
        note: 'Generated using smart templates.',
      })
    }

    return NextResponse.json(
      { error: 'Either lead or leads array must be provided in request body.' },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
