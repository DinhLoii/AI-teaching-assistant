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
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none select-none active:scale-[0.98]"
    
    const variants = {
      primary: "bg-gradient-to-r from-[#F26F21] to-[#FB923C] text-white hover:from-[#e35d10] hover:to-[#ea7617] shadow-lg shadow-orange-500/25 border border-orange-400/20",
      secondary: "bg-gradient-to-r from-[#0054A6] to-[#0284C7] text-white hover:brightness-110 shadow-md shadow-blue-500/20",
      outline: "border border-slate-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-orange-500/50 dark:hover:border-orange-500/50 shadow-xs backdrop-blur-sm",
      ghost: "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60",
      danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20",
      glass: "bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200/90 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-slate-200/80 dark:border-white/15 backdrop-blur-md",
    }

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-base px-6 py-3.5 gap-2.5 font-semibold",
      icon: "p-2.5 aspect-square",
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
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
