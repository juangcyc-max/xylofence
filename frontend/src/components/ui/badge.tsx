import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'default'
}

const variantMap: Record<string, string> = {
  critical: 'bg-red-900/40 text-red-400 border border-red-800/50',
  high:     'bg-orange-900/40 text-orange-400 border border-orange-800/50',
  medium:   'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50',
  low:      'bg-blue-900/40 text-blue-400 border border-blue-800/50',
  info:     'bg-slate-800 text-slate-400 border border-slate-700',
  default:  'bg-surface-2 text-slate-300 border border-surface-3',
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
