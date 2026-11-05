"use client"

import { Progress } from "@/components/ui/progress"
import { usePathname, useSearchParams } from "next/navigation"

export function RouteLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Next.js renders the new page before the old one is fully unloaded.
  // The progress bar appears on route change and auto-dismisses after a
  // short delay to avoid flicker on fast navigations.
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-transparent"
      style={{ pointerEvents: "none" }}
    >
      <Progress value={100} className="h-full" />
    </div>
  )
}