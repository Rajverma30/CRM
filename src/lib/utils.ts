import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
