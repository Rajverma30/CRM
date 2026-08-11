'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { User, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { Database } from '@/lib/types/database'

interface Profile {
  id: string
  role: string
  tenant_id: string
  full_name: string
  avatar_url: string | null
  is_active: boolean
  phone: string | null
  department: string | null
  joining_date: string | null
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  isLoading: boolean
  configError: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null)

  useEffect(() => {
    try {
      setSupabase(createClient())
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Supabase is not configured')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    async function fetchProfile(userId: string) {
      const { data, error } = await supabase!
        .from('profiles')
        .select('id, role, tenant_id, full_name, avatar_url, is_active, phone, department, joining_date')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error('Failed to load profile:', error.message)
        setProfile(null)
        return
      }
      setProfile(data)
    }

    async function init() {
      const { data: { user } } = await supabase!.auth.getUser()
      if (cancelled) return
      setUser(user)
      if (user) {
        await fetchProfile(user.id)
      }
      if (!cancelled) setIsLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    isAdmin: profile?.role === 'admin',
    isLoading,
    configError,
    signOut,
  }), [user, profile, isLoading, configError])

  if (configError && !hasSupabaseEnv()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold">Supabase not configured</h1>
        <p className="max-w-md text-sm text-muted-foreground">{configError}</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
