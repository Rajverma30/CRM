import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vraizen CRM',
  description: 'CRM & ERP platform by Vraizen Tech',
  icons: {
    icon: '/vraizen-logo.png',
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
