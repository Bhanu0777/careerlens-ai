import { cn } from '../../lib/utils'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      primary: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95',
      secondary: 'bg-white/8 text-slate-200 border border-white/10 hover:bg-white/12 hover:border-indigo-500/30 active:scale-95',
      ghost: 'text-slate-400 hover:text-slate-200 hover:bg-white/6 active:scale-95',
      danger: 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 active:scale-95',
      outline: 'border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 active:scale-95',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
