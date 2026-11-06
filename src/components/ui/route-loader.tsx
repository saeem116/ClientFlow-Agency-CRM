"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { useNavigationLoader } from "./navigation-loader-context"

export function RouteLoader() {
  const { isNavigating, end } = useNavigationLoader()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // End the navigation as soon as the pathname changes — the new route has
  // arrived and the server round-trip is complete. Defer the state update
  // past the current render to avoid "setState synchronously within an
  // effect" cascading-render warnings.
  useEffect(() => {
    const id = requestAnimationFrame(() => end())
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  if (!isNavigating) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-transparent"
      style={{ pointerEvents: "none" }}
    >
      <Progress
        value={100}
        className="h-full transition-opacity duration-300"
      />
    </div>
  )
}