'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RequireAuth } from '@/lib/auth/require-auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { MobileNav } from '@/components/layout/mobile-nav'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <QueryClientProvider client={queryClient}>
      <RequireAuth>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
          <div className="lg:pl-64">
            <Topbar onMenuToggle={() => setMobileOpen(o => !o)} />
            <main className="p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </RequireAuth>
    </QueryClientProvider>
  )
}
