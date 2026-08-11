'use client'

import Link from 'next/link'
import { Menu, Bell, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/auth-context'
import { getInitials } from '@/lib/utils'
import { GlobalSearch } from '@/components/shared/global-search'

interface TopbarProps {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, profile, isAdmin, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 flex items-center gap-2">
        {isAdmin && <GlobalSearch />}
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/notifications">
              <Bell className="h-5 w-5" />
            </Link>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {profile?.department && (
                <p className="text-xs text-muted-foreground mt-0.5">{profile.department}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile"><User className="mr-2 h-4 w-4" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut?.()}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
