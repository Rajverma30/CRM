import { NextRequest, NextResponse } from 'next/server'
import { LeadPitchInfo, PitchOptions, DEFAULT_SENDER_NUMBER } from '@/lib/whatsapp/utils'
import { callGemini, getGeminiApiKey } from '@/lib/ai/gemini'

interface GenerateRequest {
  lead?: LeadPitchInfo
  leads?: LeadPitchInfo[]
  focus?: PitchOptions['focus']
  language?: PitchOptions['language']
  customPrompt?: string
  senderNumber?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { lead, leads, focus = 'website', language = 'hinglish', customPrompt, senderNumber } = body
    const geminiKey = getGeminiApiKey()
    const sender = senderNumber || DEFAULT_SENDER_NUMBER

    if (!geminiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in .env or .env.local.' },
        { status: 500 }
      )
    }

    // Single lead generation strictly via Gemini API
    if (lead) {
      const prompt = `You are an elite B2B sales copywriter for Vraizen Tech (a digital marketing, web development & local business growth agency).
Our WhatsApp contact: ${sender}.

Write a personalized, high-converting, and respectful WhatsApp outreach pitch for this business:
Business Name: ${lead.business_name || 'Business'}
Contact Person: ${lead.contact_person || 'Owner'}
Category/Industry: ${lead.category || lead.industry || 'Local Business'}
Website: ${lead.website ? lead.website : 'NO WEBSITE (major pain point - losing customers)'}
Google Rating: ${lead.rating ? `${lead.rating} stars (${lead.reviews ?? 0} reviews)` : 'Not specified'}
Location: ${lead.city || lead.address || 'Local area'}

Pitch Focus: ${focus}
Language: ${language} (if hinglish: natural, conversational Indian Hinglish with appropriate emojis like 👋, 🚀, 📚, ⭐; if hindi: professional polite Hindi; if english: clean modern English).
${customPrompt ? `Special user instructions: ${customPrompt}` : ''}

CRITICAL RULES:
1. Address the business owner politely. Mention their business name (*${lead.business_name || 'your business'}*) in the opening line.
2. Value Proposition:
   - If no website: Explain how 80%+ local customers search online first and having a direct mobile website/catalog will stop customers from going to competitors.
   - If website exists: Explain how local SEO, Google Maps #1 ranking, and WhatsApp CRM will bring high-value customers without costly ads.
3. Keep it crisp, readable on phone screens (3-4 short paragraphs, not long walls of text).
4. End with a polite, low-pressure Call To Action (e.g. "Kya hum is week 5-minute call ya WhatsApp par discuss kar sakte hain ek free demo ke liye?").
5. Sign off:
Regards,
Vraizen Tech
WhatsApp: ${sender}
6. Output ONLY the message text without quotes or markdown codeblocks.`

      try {
        const { text: generatedMessage, model } = await callGemini(prompt, {
          maxTokens: 600,
          temperature: 0.7,
        })

        return NextResponse.json({
          message: generatedMessage,
          aiGenerated: true,
          provider: 'gemini',
          model,
        })
      } catch (geminiError) {
        console.error('Gemini API call failed:', geminiError)
        const errorMsg = geminiError instanceof Error ? geminiError.message : String(geminiError)
        return NextResponse.json(
          { error: `Gemini AI generation failed: ${errorMsg}` },
          { status: 500 }
        )
      }
    }

    // Batch/Bulk leads generation strictly via Gemini API
    if (leads && Array.isArray(leads) && leads.length > 0) {
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

      try {
        const { text: rawJson, model } = await callGemini(prompt, {
          maxTokens: 2048,
          temperature: 0.7,
        })
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
        const errorMsg = err instanceof Error ? err.message : String(err)
        return NextResponse.json(
          { error: `Bulk Gemini AI generation failed: ${errorMsg}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Either lead or leads array must be provided.' },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
