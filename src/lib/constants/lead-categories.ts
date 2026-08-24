export const LEAD_CATEGORIES = {
  'Real Estate': [
    'Residential Property',
    'Commercial Property',
    'Plots / Land',
    'Rental Property',
    'Property Management',
    'Real Estate Developer',
    'Broker / Agent',
    'Architecture & Interior Design',
    'Construction & Builder',
  ],
  Healthcare: [
    'Hospital',
    'Clinic',
    'Diagnostic Lab',
    'Pharmacy',
    'Dental Clinic',
    'Eye Care',
    'Physiotherapy',
    'Mental Health',
    'Ayurveda & Wellness',
  ],
} as const

export type LeadCategory = keyof typeof LEAD_CATEGORIES
export type LeadSubcategory = (typeof LEAD_CATEGORIES)[LeadCategory][number]

export const LEAD_CATEGORY_OPTIONS = Object.keys(LEAD_CATEGORIES) as LeadCategory[]

export function getLeadSubcategories(category: string): readonly string[] {
  return category in LEAD_CATEGORIES
    ? LEAD_CATEGORIES[category as LeadCategory]
    : []
}
