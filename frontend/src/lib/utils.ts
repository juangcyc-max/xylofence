import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-400'
    case 'high':     return 'text-orange-400'
    case 'medium':   return 'text-yellow-400'
    case 'low':      return 'text-blue-400'
    default:         return 'text-slate-400'
  }
}

export function severityBadgeClass(severity: string): string {
  return `badge-${severity} inline-flex items-center px-2 py-0.5 rounded text-xs font-medium`
}

export function statusBadgeClass(status: string): string {
  return `status-${status} inline-flex items-center px-2 py-0.5 rounded text-xs font-medium`
}
