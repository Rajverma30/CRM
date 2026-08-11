'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, LayoutDashboard, Users, Briefcase, FolderKanban, CheckSquare, Receipt, FileText, UserCog, CalendarCheck, BarChart3, Settings, User } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/shared/brand-logo'

const adminLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/clients', label: 'Clients', icon: Briefcase },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/proposals', label: 'Proposals', icon: FileText },
  { href: '/employees', label: 'Employees', icon: UserCog },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const employeeLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/profile', label: 'Profile', icon: User },
]

function isLinkActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const links = isAdmin ? adminLinks : employeeLinks

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-white p-4">
        <div className="flex items-center justify-between mb-6">
          <BrandLogo href="/" onClick={onClose} imageClassName="h-8 brightness-0 invert" />
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="space-y-1">
          {links.map(link => {
            const active = isLinkActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
