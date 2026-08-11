'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

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
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
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

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin: profile?.role === 'admin',
        isLoading,
        signOut,
      }}
    >
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
