'use client'

import { useRouter } from 'next/navigation'
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/lib/queries/use-notifications'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Users,
  FileText,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  payment: DollarSign,
  team: Users,
  task: FileText,
  attendance: Calendar,
}

function getTypeIcon(type: string): LucideIcon {
  return TYPE_ICONS[type] ?? Bell
}

export default function NotificationsPage() {
  const router = useRouter()
  const { data: notifications = [], isLoading } = useNotifications()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const hasUnread = notifications.some((n) => !n.read)

  function handleClick(notification: (typeof notifications)[0]) {
    if (!notification.read) {
      markAsRead.mutate(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Stay updated on important events">
        {hasUnread && (
          <Button
            variant="outline"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" /> Mark All as Read
          </Button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! Notifications will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = getTypeIcon(n.type)
            return (
              <Card
                key={n.id}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-accent/50',
                  !n.read && 'border-primary/30 bg-primary/5',
                )}
                onClick={() => handleClick(n)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={cn(
                    'rounded-full p-2 shrink-0',
                    n.read ? 'bg-muted' : 'bg-primary/10',
                  )}>
                    <Icon className={cn('h-4 w-4', n.read ? 'text-muted-foreground' : 'text-primary')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm truncate', !n.read && 'font-semibold')}>{n.title}</p>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {timeAgo(n.created_at)}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
