import type { SearchFormState, SearchResponse } from './types'

const STORAGE_KEY = 'vraizen-crm:lead-finder:lastSearch'

export interface CachedSearch {
  form: SearchFormState
  result: SearchResponse
  savedAt: string
}

export function loadCachedSearch(): CachedSearch | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as CachedSearch
    if (!data?.result || !Array.isArray(data.result.businesses)) return null
    return data
  } catch {
    return null
  }
}

export function saveCachedSearch(form: SearchFormState, result: SearchResponse): void {
  const payload: CachedSearch = { form, result, savedAt: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota errors
  }
}
