import Image from 'next/image'
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
  priority = false,
  onClick,
}: BrandLogoProps) {
  const image = (
    <Image
      src="/vraizen-logo.png"
      alt="Vraizen Tech"
      width={160}
      height={48}
      priority={priority}
      className={cn('h-9 w-auto object-contain', imageClassName)}
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
