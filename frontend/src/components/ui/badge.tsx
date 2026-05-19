import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'default'
}

const variantMap: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border border-red-200',
  high:     'bg-orange-50 text-orange-700 border border-orange-200',
  medium:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  low:      'bg-blue-50 text-blue-700 border border-blue-200',
  info:     'bg-slate-100 text-slate-600 border border-slate-200',
  default:  'bg-slate-100 text-slate-600 border border-slate-200',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variantMap[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
