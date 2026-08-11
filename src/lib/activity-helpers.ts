import { SupabaseClient } from '@supabase/supabase-js'
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Send,
  DollarSign,
  UserPlus,
  FileText,
  Clock,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  completed: CheckCircle2,
  cancelled: XCircle,
  sent: Send,
  paid: DollarSign,
  assigned: UserPlus,
  commented: FileText,
  status_changed: Clock,
}

const COLOR_MAP: Record<string, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  deleted: 'bg-red-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-gray-500',
  sent: 'bg-indigo-500',
  paid: 'bg-amber-500',
  assigned: 'bg-purple-500',
  commented: 'bg-sky-500',
  status_changed: 'bg-orange-500',
}

export function getActivityIcon(action: string): LucideIcon {
  return ICON_MAP[action] ?? Pencil
}

export function getActivityDescription(log: {
  action: string
  entity_type: string
  metadata?: Record<string, unknown> | null
}): string {
  const entity = log.entity_type.replace(/_/g, ' ')
  const meta = log.metadata

  switch (log.action) {
    case 'created':
      return `created ${entity}${meta?.name ? ` "${meta.name}"` : ''}`
    case 'updated':
      return `updated ${entity}${meta?.field ? ` (${meta.field})` : ''}`
    case 'deleted':
      return `deleted ${entity}${meta?.name ? ` "${meta.name}"` : ''}`
    case 'completed':
      return `completed ${entity}${meta?.name ? ` "${meta.name}"` : ''}`
    case 'cancelled':
      return `cancelled ${entity}`
    case 'sent':
      return `sent ${entity}`
    case 'paid':
      return `recorded payment${meta?.amount ? ` of ₹${meta.amount}` : ''}`
    case 'assigned':
      return `assigned ${entity}${meta?.assignee ? ` to ${meta.assignee}` : ''}`
    case 'commented':
      return `commented on ${entity}`
    case 'status_changed':
      return `changed ${entity} status${meta?.from && meta?.to ? ` from ${meta.from} to ${meta.to}` : ''}`
    default:
      return `${log.action} ${entity}`
  }
}

export function getActivityColor(action: string): string {
  return COLOR_MAP[action] ?? 'bg-gray-500'
}

interface CreateActivityParams {
  tenant_id: string
  actor_id: string
  entity_type: string
  entity_id: string
  action: string
  metadata?: Record<string, unknown> | null
}

export async function createActivity(supabase: SupabaseClient, params: CreateActivityParams) {
  const { error } = await supabase.from('activity_logs').insert(params)
  if (error) console.error('Failed to create activity log:', error.message)
}
