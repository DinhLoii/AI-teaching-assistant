import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-slate-200/80 dark:bg-slate-800/80',
        shimmer ? 'animate-pulse' : '',
        className
      )}
      {...props}
    />
  )
}

/**
 * Card skeleton placeholder for assignment, subject, or class cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/60 shadow-xs space-y-4 animate-pulse',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
      </div>
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    </div>
  )
}

/**
 * Grid of card skeletons for instant, smooth page transitions
 */
export function CardGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: 2 | 3 | 4 }) {
  const colClass =
    columns === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={cn('grid gap-4 sm:gap-5', colClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
