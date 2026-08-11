'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Mail, Phone, Briefcase, CalendarDays, User } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'

export function ProfileCard() {
  const { user, profile, isLoading } = useAuth()

  if (isLoading || !profile) return <LoadingSpinner className="py-6" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4" />
          My Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2 flex-1 min-w-0">
            <div>
              <h2 className="text-xl font-semibold">{profile.full_name}</h2>
              <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                {profile.role}
              </Badge>
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </p>
              {profile.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  {profile.phone}
                </p>
              )}
              {profile.department && (
                <p className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 shrink-0" />
                  {profile.department}
                </p>
              )}
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                Status: {profile.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
