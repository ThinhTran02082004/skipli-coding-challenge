import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-blue-100 text-blue-800 border-transparent',
    secondary: 'bg-slate-100 text-slate-900 border-transparent',
    outline: 'text-slate-950 border-slate-200',
    success: 'bg-emerald-100 text-emerald-700 border-transparent',
    destructive: 'bg-red-100 text-red-700 border-transparent',
  };

  return (
    <div
      className={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors', variants[variant], className)}
      {...props}
    />
  );
}

export { Badge };
