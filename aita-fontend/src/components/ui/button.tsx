import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glass"
  size?: "sm" | "md" | "lg" | "icon"
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap font-bold transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none select-none active:scale-[0.98] cursor-pointer"
    
    const variants = {
      primary: "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 text-white shadow-md shadow-orange-500/20",
      secondary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-orange-500/20",
      outline: "border border-orange-200/80 dark:border-orange-900/40 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-orange-50/60 dark:hover:bg-slate-800 hover:border-orange-300 shadow-2xs font-semibold",
      ghost: "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-semibold",
      danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20",
      glass: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold",
    }

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-xs sm:text-sm px-4 py-2 gap-2",
      lg: "text-sm sm:text-base px-5 py-2.5 gap-2.5 font-bold",
      icon: "p-2 aspect-square",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        spellCheck={false}
        data-ms-editor="false"
        data-gramm="false"
        data-enable-grammarly="false"
        translate="no"
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
