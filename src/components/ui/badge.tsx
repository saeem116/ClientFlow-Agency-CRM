import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--muted)] text-[var(--muted-foreground)] dark:bg-[var(--muted)] dark:text-[var(--muted-foreground)]",
        secondary:
          "bg-[var(--muted)] text-[var(--muted-foreground)] dark:bg-[var(--muted)] dark:text-[var(--muted-foreground)]",
        destructive:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        outline:
          "border border-slate-200 text-slate-700 dark:border-[var(--border)] dark:text-[var(--foreground)]",
        success:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        warning:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        info:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
