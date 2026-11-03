import { NextRequest, NextResponse } from 'next/server'
import { LeadPitchInfo, DEFAULT_SENDER_NUMBER } from '@/lib/whatsapp/utils'

interface StrategyRequest {
  lead?: LeadPitchInfo
  language?: 'hinglish' | 'hindi' | 'english'
  customNotes?: string
}

async function callGeminiStrategy(apiKey: string, prompt: string): Promise<{ text: string; model: string }> {
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
      if (text) return { text: text.trim(), model }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('Failed to generate strategy with Gemini')
}

function generateFallbackStrategy(lead: LeadPitchInfo, language: string): string {
  const business = lead.business_name || 'Is Business'
  const category = lead.category || lead.industry || 'Local Business'
  const hasWebsite = Boolean(lead.website && lead.website.trim() !== '')
  const rating = lead.rating ? `${lead.rating}★ (${lead.reviews ?? 0} reviews)` : 'Not specified'

  if (language === 'english') {
    return `### 🎯 Client Acquisition Strategy: ${business}

#### 1. 🔍 Digital Gap Analysis
* **Website Status:** ${hasWebsite ? `Has website (${lead.website}) but likely lacks modern lead capture, mobile speed, and direct WhatsApp booking.` : 'NO WEBSITE! This is the #1 vulnerability. Customers searching on Google have nowhere to browse services or book directly.'}
* **Reputation & Visibility:** Google Rating: ${rating}. ${lead.reviews && lead.reviews < 30 ? 'Low review count allows local competitors to outrank them easily.' : 'Good review count, can be leveraged for high-authority branding.'}

#### 2. 💡 Recommended Services to Pitch
1. **Custom Mobile-First Website:** Fast-loading showcase with instant WhatsApp call-to-action.
2. **Google Maps (GMB) Local SEO:** Rank in top 3 local pack to capture high-intent searchers.
3. **WhatsApp CRM & Lead Automation:** Auto-reply to customer inquiries within 10 seconds.

#### 3. 📞 30-Second Cold Call Hook
> "Hello! I noticed ${business} on Google. You have a great local reputation, but when people search for '${category} near me', your competitors are capturing most of the online inquiries because they have direct booking. If I showed you how to get 15-20 extra clients this month without paying for expensive ads, would you be open to a 5-minute chat?"

#### 4. 🛡️ Objection Handling
* **"We already get enough walk-ins / word of mouth":**
  * *Reply:* "Word of mouth is great, but 80% of new residents and tourists search Google first. Having a digital presence ensures you never leave money on the table."
* **"We don't have budget right now":**
  * *Reply:* "We build solutions that pay for themselves within 30 days. Let me create a free design mockup first—if you love it, we can discuss flexible pricing."

#### 5. 💰 Closing Offer
Offer a **Zero-Risk Free Live Demo Mockup** of their new website + a free Google Maps audit report.`
  }

  // Default: Hinglish
  return `### 🎯 Client Acquisition Strategy: ${business}

#### 1. 🔍 Gap Analysis (Kaha kami hai aur isko kaise grab karein)
* **Website Status:** ${hasWebsite ? `Website hai (${lead.website}), lekin isme direct WhatsApp ordering / modern design aur conversion funnel ki kami ho sakti hai.` : 'KOI WEBSITE NAHI HAI! Ye inka sabse bada minus point hai. Google par dhoondhne wale naye customers inki jagah un competitors ke paas chale jaate hain jinki website hai.'}
* **Google Maps & Reviews:** Rating: ${rating}. ${lead.reviews && lead.reviews < 30 ? 'Reviews kam hain, isliye Google Maps inko top par recommend nahi karta.' : 'Reviews acche hain, ise social proof ke roop me use karke top brand banaya ja sakta hai.'}

#### 2. 💡 Inko Kya-Kya Services Sell Karni Chahiye?
1. **Fast Mobile-Friendly Website:** WhatsApp direct booking button ke saath, jisse customer 1-click me order/inquiry kare.
2. **Google Maps Local SEO:** Local area me category (${category}) search karne par top 3 me lana.
3. **Automated WhatsApp CRM:** Jo bhi customer call kare, use automatic greeting aur catalog link chala jaaye.

#### 3. 📞 30-Second Call / Meeting Opening Hook
> "Namaste sir! Maine Google par ${business} dekha. Aapka kaam kaafi behtareen hai, par ek choti si problem notice ki—jab aas-paas ke log Google par '${category}' search karte hain, toh aapki jagah dusre competitors aage aa jaate hain kyunki unki proper online booking website hai. Agar main aapko dikhaun ki bina mehenge ads ke har mahine 20-30 naye direct customers kaise layein, toh kya kal 5 minute baat kar sakte hain?"

#### 4. 🛡️ Objection Handling (Jab ye mana karein toh kya bolein)
* **Agar bole: "Humara kaam aise hi theek chal raha hai offline":**
  * *Jawab:* "Sir offline aapka naam bohot achha hai, lekin jo naye log shehar me aate hain wo seedhe Google check karte hain. Ek digital profile hone se aapke purane grahak toh rahenge hi, naye grahak bhi automatic aane lagenge."
* **Agar bole: "Abhi budget nahi hai":**
  * *Jawab:* "Sir budget ki koi chinta nahi hai. Pehle hum aapko ek free sample mockup bana kar dikhayenge. Pasand aaye toh hi aage baat karenge, varna aapka koi kharcha nahi."

#### 5. 💰 Deal Close Karne Ka Tareeka (Closing Angle)
* **Free Demo Offer:** "Sir humne aapke business ke liye ek sample website design plan kiya hai, 2 minute me WhatsApp par link bhej raha hoon, dekhiye kaisa laga!"`
}

export async function POST(request: NextRequest) {
  try {
    const body: StrategyRequest = await request.json()
    const { lead, language = 'hinglish', customNotes } = body

    if (!lead) {
      return NextResponse.json({ error: 'Lead details are required' }, { status: 400 })
    }

    const rawKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || ''
    const geminiKey = rawKey.trim()

    if (geminiKey) {
      try {
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
- Website: ${hasWebsite ? lead.website : 'NO WEBSITE'}
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

        const { text: strategy, model } = await callGeminiStrategy(geminiKey, prompt)
        return NextResponse.json({
          strategy,
          aiGenerated: true,
          provider: 'gemini',
          model,
        })
      } catch (err) {
        console.error('Gemini Strategy generation failed, using fallback:', err)
      }
    }

    // Fallback strategy
    const fallback = generateFallbackStrategy(lead, language)
    return NextResponse.json({
      strategy: fallback,
      aiGenerated: false,
      note: 'Generated using strategic templates.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

