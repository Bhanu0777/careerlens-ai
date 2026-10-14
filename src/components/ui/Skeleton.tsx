import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'line' | 'block' | 'circle' | 'card'
  lines?: number
}

/** Single shimmer block */
export function Skeleton({ className, variant = 'block' }: SkeletonProps) {
  const base = 'shimmer rounded-lg'
  const variantClass = {
    line: 'h-3 w-full',
    block: 'h-10 w-full',
    circle: 'rounded-full w-10 h-10',
    card: 'h-32 w-full rounded-2xl',
  }[variant]
  return <div className={cn(base, variantClass, className)} />
}

/** Skeleton for a Job Card */
export function JobCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1 pr-4">
          <Skeleton variant="line" className="w-3/4 h-4" />
          <Skeleton variant="line" className="w-1/2 h-3" />
        </div>
        <Skeleton variant="block" className="w-16 h-7 rounded-full" />
      </div>
      <Skeleton variant="block" className="h-2 rounded-full" />
      <div className="flex gap-1.5">
        {[1,2,3].map(i => <Skeleton key={i} variant="block" className="w-16 h-5 rounded-md" />)}
      </div>
      <div className="flex justify-between pt-2 border-t border-white/5">
        <Skeleton variant="line" className="w-24 h-3" />
        <Skeleton variant="block" className="w-20 h-7 rounded-xl" />
      </div>
    </div>
  )
}

/** Skeleton for a stat card */
export function StatCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <Skeleton variant="circle" className="w-9 h-9 rounded-xl" />
      <div className="space-y-2 flex-1">
        <Skeleton variant="line" className="w-12 h-5" />
        <Skeleton variant="line" className="w-20 h-3" />
      </div>
    </div>
  )
}

/** Skeleton for a score ring card */
export function ScoreCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4">
      <Skeleton variant="circle" className="w-36 h-36" />
      <div className="w-full space-y-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex justify-between gap-4">
            <Skeleton variant="line" className="flex-1 h-2" />
            <Skeleton variant="line" className="w-8 h-2" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Full page loading fallback for React.lazy Suspense */
export function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton variant="line" className="w-48 h-7" />
        <Skeleton variant="line" className="w-72 h-4" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <ScoreCardSkeleton />
        <div className="md:col-span-2 space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} variant="block" className="h-12 rounded-xl" />)}
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[1,2,3].map(i => <JobCardSkeleton key={i} />)}
      </div>
    </div>
  )
}
