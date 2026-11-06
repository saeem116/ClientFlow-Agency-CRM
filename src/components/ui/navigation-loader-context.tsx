"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"

interface NavigationLoaderContextType {
  /** Whether a navigation is currently in progress. */
  isNavigating: boolean
  /** Begin a navigation — call this from a Link onClick before the route changes. */
  begin: () => void
  /** End a navigation — called automatically when the pathname changes. */
  end: () => void
}

const NavigationLoaderContext =
  createContext<NavigationLoaderContextType | null>(null)

export function NavigationLoaderProvider({
  children,
}: {
  children: ReactNode
}) {
  const [isNavigating, setIsNavigating] = useState(false)

  const begin = useCallback(() => {
    setIsNavigating(true)
  }, [])

  const end = useCallback(() => {
    setIsNavigating(false)
  }, [])

  return (
    <NavigationLoaderContext.Provider value={{ isNavigating, begin, end }}>
      {children}
    </NavigationLoaderContext.Provider>
  )
}

export function useNavigationLoader(): NavigationLoaderContextType {
  const context = useContext(NavigationLoaderContext)
  if (!context) {
    throw new Error(
      "useNavigationLoader must be used within a NavigationLoaderProvider"
    )
  }
  return context
}