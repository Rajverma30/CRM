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
