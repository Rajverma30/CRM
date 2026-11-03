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

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const models = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
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
            maxOutputTokens: 2048,
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
      if (text) return text.trim()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // Continue to next model if this one failed
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini')
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { lead, leads, focus = 'website', language = 'hinglish', customPrompt, senderNumber } = body
    const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY
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
          const prompt = `You are a professional B2B outreach specialist for Vraizen Tech (a high-growth digital agency that builds modern websites, Google Maps ranking/SEO, and CRM automation for local businesses).
Our sender phone number is: ${sender}.

Write a personalized, friendly, and high-converting WhatsApp outreach message for this business:
Business Name: ${lead.business_name || 'Business'}
Contact Person: ${lead.contact_person || 'Owner'}
Category/Industry: ${lead.category || lead.industry || 'Local Business'}
Website: ${lead.website ? lead.website : 'No website currently'}
Rating: ${lead.rating ? `${lead.rating} stars (${lead.reviews ?? 0} reviews)` : 'Not specified'}
Location: ${lead.city || lead.address || 'Local area'}

Pitch Focus: ${focus} (e.g. highlighting why they need a website / Google Maps growth / tech automation)
Language: ${language} (if hinglish: natural, conversational Indian Hinglish with appropriate emojis like 👋, 🚀, ⭐; if hindi: professional polite Hindi; if english: clean modern English).
${customPrompt ? `Additional instructions from user: ${customPrompt}` : ''}

CRITICAL RULES:
1. Keep the message concise (3-5 short paragraphs/bullet points max, easy to read on a mobile phone screen).
2. DO NOT make it sound like spam. Address the owner politely, mention their specific business name (${lead.business_name || 'your business'}), and compliment their work.
3. If they don't have a website, explain how having an online presence/booking site will bring them 2x more local clients.
4. End with a polite, non-pushy Call To Action (e.g., "Kya hum is week 5-minute call ya WhatsApp par discuss kar sakte hain ek free demo ke liye?").
5. Sign off with:
Regards,
Vraizen Tech
WhatsApp: ${sender}
6. Return ONLY the final message text. Do NOT include markdown code blocks, explanations, or quotes around it.`

          const generatedMessage = await callGemini(geminiKey, prompt)
          return NextResponse.json({
            message: generatedMessage,
            aiGenerated: true,
            provider: 'gemini',
          })
        } catch (geminiError) {
          console.warn('Gemini generation failed, falling back to smart template:', geminiError)
          // Fall back to template seamlessly
          const fallback = generateSmartWhatsAppMessage(lead, pitchOptions)
          return NextResponse.json({
            message: fallback,
            aiGenerated: false,
            fallbackReason: geminiError instanceof Error ? geminiError.message : 'Gemini call failed',
          })
        }
      }

      // No Gemini key configured -> use smart template
      const fallback = generateSmartWhatsAppMessage(lead, pitchOptions)
      return NextResponse.json({
        message: fallback,
        aiGenerated: false,
        note: 'Generated using smart templates. Add GEMINI_API_KEY in .env for custom AI generation.',
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

Generate personalized WhatsApp messages for each of the following leads.
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

Guidelines for each message:
- 3 to 5 short paragraphs with emojis.
- Personalized to their business name and industry.
- Mention our agency Vraizen Tech and sender number ${sender}.
- Clean, polite CTA.

Leads list:
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

          const rawJson = await callGemini(geminiKey, prompt)
          // Clean JSON response in case model wrapped it in markdown
          const cleanedJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
          const parsed = JSON.parse(cleanedJson)

          return NextResponse.json({
            messages: parsed.messages || [],
            aiGenerated: true,
            provider: 'gemini',
          })
        } catch (err) {
          console.warn('Bulk Gemini generation failed, falling back to smart templates:', err)
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

