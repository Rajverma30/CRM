import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  href?: string
  className?: string
  imageClassName?: string
  priority?: boolean
  onClick?: () => void
}

export function BrandLogo({
  href = '/',
  className,
  imageClassName,
  onClick,
}: BrandLogoProps) {
  const image = (
    <img
      src="/vraizen-logo.png"
      alt="Vraizen Tech"
      className={cn('h-20 w-auto object-contain', imageClassName)}
    />
  )

  if (!href) {
    return <div className={className}>{image}</div>
  }

  return (
    <Link href={href} onClick={onClick} className={cn('inline-flex items-center', className)}>
      {image}
    </Link>
  )
}
