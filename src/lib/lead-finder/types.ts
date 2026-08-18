export type WebsiteFilter = 'all' | 'has_website' | 'no_website'
export type PhoneFilter = 'all' | 'has_phone' | 'no_phone'

export interface SearchFormState {
  business_type: string
  location: string
  min_rating: number
  max_rating: number
  website_filter: WebsiteFilter
  phone_filter: PhoneFilter
  min_reviews: number
  max_reviews: string
  potential_web_dev_leads: boolean
  deep_search: boolean
  page: number
  page_size: number
}

export interface BusinessLead {
  place_id: string
  name: string
  rating: number | null
  review_count: number | null
  category: string | null
  address: string | null
  phone: string | null
  international_phone: string | null
  website: string | null
  google_maps_url: string | null
  latitude: number | null
  longitude: number | null
  business_status: string | null
  lead_score: number
}

export interface SearchRequest {
  business_type: string
  location: string
  min_rating: number
  max_rating: number
  website_filter: WebsiteFilter
  phone_filter: PhoneFilter
  min_reviews: number
  max_reviews: number | null
  potential_web_dev_leads: boolean
  deep_search: boolean
  page: number
  page_size: number
}

export interface SearchResponse {
  businesses: BusinessLead[]
  total: number
  page: number
  page_size: number
  total_pages: number
  query: string
  location: string
  coverage_note: string
  raw_fetched: number
  after_filters: number
}

export interface CachedExportRequest {
  format: 'csv' | 'xlsx'
  businesses: BusinessLead[]
  business_type: string
  location: string
}

export interface ApiErrorDetail {
  message?: string
  code?: string
}
