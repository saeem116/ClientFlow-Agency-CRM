"use client"

import { usePathname } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import type { Session } from "@/lib/auth"

function ShellRouter({
  children,
  session,
  org,
}: {
  children: React.ReactNode
  session: Session | null
  org: { id: string; name: string; slug: string } | null
}) {
  const pathname = usePathname()
  const { user, org: authOrg } = useAuth()

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/login")

  // The shell decision is driven by the auth context, which is seeded from
  // the server-rendered session and refreshed client-side after sign-in.
  // This means a client-side navigation to /dashboard (e.g. router.push from
  // the sign-in form) immediately shows the sidebar without a manual reload.
  //
  // The org is also sourced from the context so it stays synchronized across
  // client-side navigations (the server-rendered `org` prop is only valid for
  // the initial page load).
  if (isPublicRoute || !user) {
    return <>{children}</>
  }

  return <AppShell session={session} org={authOrg ?? org}>{children}</AppShell>
}

export function LayoutWrapper({
  children,
  session,
  org,
}: {
  children: React.ReactNode
  session: Session | null
  org: { id: string; name: string; slug: string } | null
}) {
  return (
    <AuthProvider initialUser={session?.user ?? null} initialOrg={org}>
      <ShellRouter session={session} org={org}>
        {children}
      </ShellRouter>
    </AuthProvider>
  )
}