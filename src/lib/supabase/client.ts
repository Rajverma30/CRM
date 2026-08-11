import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'
import { getSupabaseClientConfig } from '@/lib/supabase/env'

export function createClient() {
  const { url, anonKey } = getSupabaseClientConfig()
  return createBrowserClient<Database>(url, anonKey)
}
