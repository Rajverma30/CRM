import { NextRequest, NextResponse } from 'next/server'
import { LeadPitchInfo, DEFAULT_SENDER_NUMBER } from '@/lib/whatsapp/utils'
import { callGemini, getGeminiApiKey } from '@/lib/ai/gemini'

interface StrategyRequest {
  lead?: LeadPitchInfo
  language?: 'hinglish' | 'hindi' | 'english'
  customNotes?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: StrategyRequest = await request.json()
    const { lead, language = 'hinglish', customNotes } = body

    if (!lead) {
      return NextResponse.json({ error: 'Lead details are required' }, { status: 400 })
    }

    const geminiKey = getGeminiApiKey()
    if (!geminiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in .env or .env.local.' },
        { status: 500 }
      )
    }

    const business = lead.business_name || 'This Business'
    const category = lead.category || lead.industry || 'Local Business'
    const hasWebsite = Boolean(lead.website && lead.website.trim() !== '')

    const prompt = `You are the Chief B2B Sales Strategist & Agency Consultant for Vraizen Tech (Digital Marketing, Web Design, Local SEO, and CRM Automation agency).
Sender Agency Contact: ${DEFAULT_SENDER_NUMBER}.

Your task is to analyze this business and write a comprehensive, actionable "CLIENT ACQUISITION & APPROACH PLAYBOOK" on HOW TO GRAB / CLOSE THIS CLIENT.

Business Profile:
- Business Name: ${business}
- Contact Person: ${lead.contact_person || 'Owner'}
- Category/Industry: ${category}
- City / Address: ${lead.city || lead.address || 'Local area'}
- Website: ${hasWebsite ? lead.website : 'NO WEBSITE (Crucial opening for sales pitch)'}
- Google Rating: ${lead.rating ? `${lead.rating} stars (${lead.reviews ?? 0} reviews)` : 'Not specified'}
- Google Maps URL: ${lead.google_maps_url || 'Not specified'}
- Phone: ${lead.phone || 'Not specified'}
${customNotes ? `- User Notes: ${customNotes}` : ''}

Language: ${language} (if hinglish: natural, conversational Indian Hinglish with high energy and bullet points; if hindi: professional clear Hindi; if english: sharp executive English).

Please structure your response with these exact sections:
### 1. 🔍 Digital Gap & Vulnerability Analysis (Inka sabse bada pain point kya hai)
Analyze what they are missing (website, low reviews, poor ranking, no automated WhatsApp booking). Explain why they are losing revenue every day to competitors.

### 2. 💡 Exact Services to Pitch & Package (Inko kya sell karein)
Pick 2-3 specific high-impact services for this industry (e.g. Mobile Website, Local SEO, Review Automation, WhatsApp CRM). Explain the clear benefit for each.

### 3. 📞 30-Second Icebreaker / Call Script (Pehle 30 second me kya bolna hai)
Provide a word-for-word opening script for a phone call or WhatsApp audio note that instantly hooks the owner and prevents them from hanging up.

### 4. 🛡️ Objection Killers (Kaise deal bachaayein)
Address the 2 most common objections for this industry (e.g. "Offline hi theek hai" or "Budget nahi hai") with witty, respectful counter-arguments that flip the script.

### 5. 💰 Closing Angle & Low-Friction Offer (Kaise deal finalize karein)
Provide an irresistible closing technique (like a free demo mockup, free GMB audit, or limited festival package).

Tone: Highly strategic, practical, action-oriented, encouraging. Output in clean Markdown.`

    try {
      const { text: strategy, model } = await callGemini(prompt, {
        maxTokens: 1500,
        temperature: 0.7,
      })

      return NextResponse.json({
        strategy,
        aiGenerated: true,
        provider: 'gemini',
        model,
      })
    } catch (err) {
      console.error('Gemini Strategy generation failed:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { error: `Gemini Strategy generation failed: ${errorMsg}` },
        { status: 500 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
