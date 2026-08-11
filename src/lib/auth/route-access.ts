/** Routes only accessible to admin users */
export const ADMIN_ROUTE_PREFIXES = [
  '/leads',
  '/clients',
  '/projects',
  '/billing',
  '/proposals',
  '/employees',
  '/attendance',
  '/reports',
  '/settings',
  '/notifications',
  '/client-requests',
] as const

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
