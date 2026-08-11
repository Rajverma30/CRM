import { Badge, type BadgeProps } from '@/components/ui/badge'
import { capitalize } from '@/lib/utils'

type BadgeVariant = NonNullable<BadgeProps['variant']>

const statusVariantMap: Record<string, BadgeVariant> = {
  // Task
  todo: 'secondary',
  in_progress: 'default',
  in_review: 'warning',
  done: 'success',
  cancelled: 'destructive',
  // Project
  planning: 'secondary',
  active: 'success',
  on_hold: 'warning',
  completed: 'success',
  archived: 'outline',
  // Client
  prospect: 'secondary',
  onboarded: 'success',
  churned: 'destructive',
  // Lead
  new: 'default',
  contacted: 'secondary',
  qualified: 'warning',
  converted: 'success',
  lost: 'destructive',
  // Payment
  pending: 'warning',
  paid: 'success',
  overdue: 'destructive',
  partial: 'warning',
  // Subscription
  trial: 'secondary',
  expired: 'destructive',
  // Proposal
  draft: 'secondary',
  sent: 'default',
  viewed: 'warning',
  accepted: 'success',
  rejected: 'destructive',
  // Generic
  inactive: 'outline',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariantMap[status] ?? 'secondary'
  return (
    <Badge variant={variant} className={className}>
      {capitalize(status)}
    </Badge>
  )
}
