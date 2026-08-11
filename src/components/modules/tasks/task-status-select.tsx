'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { useUpdateTaskStatus } from '@/lib/queries/use-tasks'
import { TaskStatus } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { capitalize } from '@/lib/utils'

const STATUS_OPTIONS: { value: TaskStatus; label: string; variant: string }[] = [
  { value: 'pending', label: 'Pending', variant: 'warning' },
  { value: 'in_progress', label: 'In Progress', variant: 'default' },
  { value: 'review', label: 'Review', variant: 'secondary' },
  { value: 'completed', label: 'Completed', variant: 'success' },
  { value: 'blocked', label: 'Blocked', variant: 'destructive' },
]

function getStatusVariant(status: TaskStatus) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.variant ?? 'secondary'
}

interface TaskStatusSelectProps {
  taskId: string
  currentStatus: TaskStatus
  assignedTo: string | null
  disabled?: boolean
}

export function TaskStatusSelect({ taskId, currentStatus, assignedTo, disabled }: TaskStatusSelectProps) {
  const { profile, isAdmin } = useAuth()
  const updateStatus = useUpdateTaskStatus()

  const canChange = isAdmin || profile?.id === assignedTo
  if (!canChange) {
    return (
      <Badge variant={getStatusVariant(currentStatus) as 'default'}>
        {capitalize(currentStatus)}
      </Badge>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || updateStatus.isPending}>
        <button className="cursor-pointer">
          <Badge variant={getStatusVariant(currentStatus) as 'default'}>
            {capitalize(currentStatus)}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            disabled={opt.value === currentStatus}
            onClick={() => updateStatus.mutate({ id: taskId, status: opt.value })}
          >
            <Badge variant={opt.variant as 'default'} className="mr-2">
              {opt.label}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { getStatusVariant, STATUS_OPTIONS }
