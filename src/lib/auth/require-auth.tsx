'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="text-muted-foreground max-w-md">
          Your account is signed in, but no CRM profile exists yet. Ask an admin to create your employee profile.
        </p>
      </div>
    )
  }

  if (!profile.is_active) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-destructive">Account Deactivated</h1>
        <p className="text-muted-foreground">
          Your account has been deactivated. Please contact your administrator.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
