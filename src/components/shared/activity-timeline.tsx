'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import { getActivityIcon, getActivityDescription, getActivityColor } from '@/lib/activity-helpers'
import type { ActivityLogWithActor } from '@/lib/queries/use-activity-logs'

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

interface ActivityTimelineProps {
  logs: ActivityLogWithActor[]
  className?: string
}

export function ActivityTimeline({ logs, className }: ActivityTimelineProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-[17px] top-3 bottom-3 w-px bg-border" />
      <div className="space-y-6">
        {logs.map((log) => {
          const Icon = getActivityIcon(log.action)
          const color = getActivityColor(log.action)
          return (
            <div key={log.id} className="relative flex gap-3">
              <div className={cn('relative z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-white', color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px]">
                      {getInitials(log.profiles.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{log.profiles.full_name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(log.created_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {getActivityDescription(log)}
                </p>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground bg-muted rounded px-2 py-1 inline-block">
                    {Object.entries(log.metadata)
                      .filter(([k]) => !['name', 'field', 'from', 'to', 'amount', 'assignee'].includes(k))
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
