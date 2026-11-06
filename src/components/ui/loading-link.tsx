"use client"

import { useCallback, type ReactNode } from "react"
import Link from "next/link"
import { useNavigationLoader } from "./navigation-loader-context"

interface LoadingLinkProps {
  href: string
  children: ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  "aria-label"?: string
  style?: React.CSSProperties
}

/**
 * A wrapper around next/link that triggers the global navigation loader
 * BEFORE the route change begins, so the user sees immediate feedback
 * when clicking a menu item.
 *
 * The loader is ended automatically by RouteLoader when the pathname
 * changes (the new route has arrived).
 */
export function LoadingLink({
  href,
  children,
  className,
  onClick,
  "aria-label": ariaLabel,
  style,
}: LoadingLinkProps) {
  const { begin } = useNavigationLoader()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Only trigger the loader for left-click navigation, not for
      // modifier-clicks (open in new tab, download, etc.).
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      // Begin the navigation loader immediately.
      begin()

      // Allow the caller to run additional logic (e.g. closing the mobile menu).
      onClick?.(e)
    },
    [begin, onClick]
  )

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </Link>
  )
}