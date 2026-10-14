import { cn, getFitBadge } from '../../lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate'
  className?: string
  size?: 'sm' | 'md'
}

const variantStyles = {
  default: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  slate: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
}

export function Badge({ children, variant = 'default', className, size = 'sm' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-medium border rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[10px] tracking-wide' : 'px-2.5 py-1 text-xs',
      variantStyles[variant],
      className
    )}>
      {children}
    </span>
  )
}

export function FitBadge({ score, className }: { score: number; className?: string }) {
  const { label, className: badgeClass } = getFitBadge(score)
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-widest rounded-full border', badgeClass, className)}>
      {label}
    </span>
  )
}

export function SkillBadge({ skill, matched = true }: { skill: string; matched?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border font-medium',
      matched
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    )}>
      <span>{matched ? '✓' : '✗'}</span>
      {skill}
    </span>
  )
}
