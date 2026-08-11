'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { ProfileCard } from '@/components/modules/employees/profile-card'
import { PageHeader } from '@/components/shared/page-header'

export default function ProfilePage() {
  const { profile } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="My Profile"
        description="Your account information"
      />
      <ProfileCard />
      {profile?.joining_date && (
        <p className="text-sm text-muted-foreground">
          Joined on {new Date(profile.joining_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}
    </div>
  )
}
