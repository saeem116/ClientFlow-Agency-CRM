"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { Session } from "./auth"

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: string
  organizationId: string
}

export interface AuthOrg {
  id: string
  name: string
  slug: string
}

export interface AuthContextType {
  user: AuthUser | null
  org: AuthOrg | null
  isDemo: boolean
  loading: boolean
  error: string | null
  /** Re-validate the session against the server. Resolves once the request
   *  completes (success or 401). Use after sign-in/sign-up to update the UI
   *  without a full reload. */
  refresh: () => Promise<void>
  /** Optimistically clear local state on sign-out. */
  setUser: (user: AuthUser | null) => void
  /** Optimistically update the org (e.g. after a settings change). */
  setOrg: (org: AuthOrg | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  initialUser,
  initialOrg,
  initialIsDemo,
}: {
  children: ReactNode
  initialUser: Session["user"] | null
  initialOrg: { id: string; name: string; slug: string } | null
  initialIsDemo: boolean
}) {
  const [user, setUserState] = useState<AuthUser | null>(initialUser ?? null)
  const [org, setOrgState] = useState<AuthOrg | null>(initialOrg ?? null)
  const [isDemo, setIsDemo] = useState<boolean>(initialIsDemo ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      })
      if (!response.ok) {
        setUserState(null)
        setOrgState(null)
        setIsDemo(false)
        return
      }
      const data = await response.json()
      setUserState(data.user ?? null)
      setOrgState(data.org ?? null)
      setIsDemo(!!data.isDemo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh session")
      setUserState(null)
      setOrgState(null)
      setIsDemo(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-validate on mount so client-side navigation reflects the freshly-set
  // cookie immediately.
  useEffect(() => {
    if (user) return
    let cancelled = false
    ;(async () => {
      await refresh()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
    // refresh is stable (useCallback with no deps) so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const setUser = useCallback((next: AuthUser | null) => {
    setUserState(next)
  }, [])

  const setOrg = useCallback((next: AuthOrg | null) => {
    setOrgState(next)
  }, [])

  return (
    <AuthContext.Provider value={{ user, org, isDemo, loading, error, refresh, setUser, setOrg }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
