"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
}

export function Skeleton({
  className,
  variant = "text",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-muted",
        {
          "h-4 w-full": variant === "text",
          "h-10 w-10 rounded-full": variant === "circular",
          "h-12 w-12 rounded-lg": variant === "rectangular",
        },
        className
      )}
      {...props}
    />
  )
}