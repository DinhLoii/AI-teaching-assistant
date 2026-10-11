import * as React from "react"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"

export interface AnonymousAvatarProps {
  src?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function AnonymousAvatar({
  src,
  alt,
  size = 'md',
  className,
}: AnonymousAvatarProps) {
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [src])

  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-18 h-18',
  }[size]

  const iconDimensions = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-9 h-9',
  }[size]

  return (
    <div
      className={cn(
        dimensions,
        'rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden select-none',
        className
      )}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="w-full h-full object-cover rounded-full"
          onError={() => setHasError(true)}
        />
      ) : (
        <User className={cn(iconDimensions, 'text-slate-400 dark:text-slate-500 fill-slate-300/80 dark:fill-slate-600')} />
      )}
    </div>
  )
}
