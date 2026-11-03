export interface LeadPitchInfo {
  id?: string
  business_name?: string | null
  contact_person?: string | null
  phone?: string | null
  category?: string | null
  industry?: string | null
  website?: string | null
  rating?: number | null
  reviews?: number | null
  city?: string | null
  address?: string | null
  google_maps_url?: string | null
}

export interface PitchOptions {
  focus?: 'website' | 'google_maps' | 'software' | 'general'
  language?: 'hinglish' | 'hindi' | 'english'
  senderNumber?: string
  customNote?: string
}

export const DEFAULT_SENDER_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_SENDER_NUMBER || '8602558138'

/**
 * Cleans phone number to international WhatsApp format (e.g. 918602558138).
 */
export function cleanWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')

  if (digits.startsWith('00')) {
    digits = digits.substring(2)
  }

  // If 10-digit standard Indian phone number (common case)
  if (digits.length === 10) {
    return `91${digits}`
  }

  // If starts with 0 and 11 digits (e.g. 08602558138)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.substring(1)}`
  }

  return digits
}

/**
 * Generates an official WhatsApp send URL.
 * Works seamlessly on WhatsApp Web and WhatsApp Mobile App.
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = cleanWhatsAppNumber(phone)
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
}

/**
 * Smart template fallback generator when Gemini API key is not configured yet or fails.
 */
export function generateSmartWhatsAppMessage(
  lead: LeadPitchInfo,
  options: PitchOptions = {}
): string {
  const business = lead.business_name || 'Aapka Business'
  const contact = lead.contact_person ? ` ${lead.contact_person}` : ''
  const category = lead.category || lead.industry || 'business'
  const senderPhone = options.senderNumber || DEFAULT_SENDER_NUMBER
  const focus = options.focus || 'website'
  const language = options.language || 'hinglish'
  const hasWebsite = Boolean(lead.website && lead.website.trim() !== '')

  if (language === 'english') {
    if (focus === 'website' || (!hasWebsite && focus !== 'google_maps')) {
      return `Hello${contact}! 👋

I noticed ${business} on Google and saw you are doing great work in the ${category} space.

However, I noticed you don't have a modern mobile-friendly website / online booking system yet. A dedicated website can help you attract 2x more local clients directly without paying high commissions.

We build high-converting websites and CRM automation for ${category} businesses.

Would you be open to a quick 5-minute call or chat to see a demo?

Best regards,
Vraizen Tech
WhatsApp: ${senderPhone}`
    }

    if (focus === 'google_maps') {
      return `Hello${contact}! 👋

I came across ${business} on Google Maps. You have a great presence, but optimizing your Google Business Profile and local SEO can rank you #1 in your local area for ${category}.

We help local businesses increase their inquiries and direct phone calls by 40-60%.

Can we connect for a quick 5-minute chat this week?

Best regards,
Vraizen Tech
WhatsApp: ${senderPhone}`
    }

    return `Hello${contact}! 👋

Greetings from Vraizen Tech. We came across ${business} and love what you're building in ${category}.

We help businesses automate client inquiries, build custom websites, and grow their local sales through modern tech.

Are you available for a brief 5-minute chat this week to explore how we can help ${business} grow?

Best regards,
Vraizen Tech
WhatsApp: ${senderPhone}`
  }

  if (language === 'hindi') {
    if (focus === 'website' || (!hasWebsite && focus !== 'google_maps')) {
      return `नमस्ते${contact}! 🙏

हमने Google पर ${business} देखा। आपका ${category} का काम बहुत ही बढ़िया है!

हमने ध्यान दिया कि अभी आपके पास अपनी आधुनिक वेबसाइट / ऑनलाइन कैटलॉग नहीं है। अपनी वेबसाइट होने से ग्राहक सीधे आपसे जुड़ते हैं और ऑर्डर/बुकिंग 2 गुना तक बढ़ जाती है।

हम ${category} व्यवसायों के लिए आधुनिक वेबसाइट और डिजिटल ग्रोथ समाधान बनाते हैं।

क्या हम इस हफ्ते 5 मिनट की बातचीत कर सकते हैं?

सादर,
Vraizen Tech
WhatsApp / Call: ${senderPhone}`
    }

    return `नमस्ते${contact}! 🙏

हमने Google पर ${business} देखा। आपके ${category} व्यवसाय को और तेज़ी से बढ़ाने और नए ग्राहक लाने के लिए हम डिजिटल सॉल्यूशन्स और वेबसाइट्स प्रदान करते हैं।

क्या आप अपने व्यवसाय की ग्रोथ के लिए 5 मिनट बात करने के लिए उपलब्ध हैं?

सादर,
Vraizen Tech
WhatsApp: ${senderPhone}`
  }

  // Default: Hinglish (highest conversion in India)
  if (focus === 'website' || (!hasWebsite && focus !== 'google_maps')) {
    return `Hello${contact}! 👋

Maine Google par *${business}* dekha. Aapka ${category} ka setup kaafi achha hai! 👏

Ek cheez notice ki — abhi aapka koi personal website ya direct online booking/catalog link nahi hai. Aaj kal 80% customers direct website dekh kar call/visit karte hain.

Hum ${category} businesses ke liye professional, fast aur modern websites design karte hain jisse direct customers badhein.

Kya hum is week 5-minute call ya WhatsApp par discuss kar sakte hain ek free demo ke liye?

Regards,
*Vraizen Tech*
WhatsApp: ${senderPhone}`
  }

  if (focus === 'google_maps') {
    return `Hello${contact}! 👋

Maine Google Maps par *${business}* dekha. Aapka business kaafi achha chal raha hai! ⭐

Hum local businesses ki Google Maps ranking aur 5-star customer reviews boost karne me madad karte hain, jisse jab koi aas-paas ${category} search kare toh sabse upar aapka naam aaye.

Kya aap is week 5-minute baat karne ke liye free hain?

Regards,
*Vraizen Tech*
WhatsApp: ${senderPhone}`
  }

  return `Hello${contact}! 👋

Hope you are doing great! Maine Google par *${business}* dekha.

Hum ${category} businesses ke liye modern websites, CRM aur digital sales automation provide karte hain jisse leads aur customers automate ho sakein.

Kya hum is week 5 min connect kar sakte hain ye dekhne ke liye ki hum aapke business ko grow karne me kaise help kar sakte hain?

Regards,
*Vraizen Tech*
WhatsApp: ${senderPhone}`
}

