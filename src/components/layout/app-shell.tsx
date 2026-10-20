"use client"

import { cn } from "@/lib/utils"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useState } from "react"
import { Session } from "@/lib/auth"

export function AppShell({
  children,
  session,
  org,
}: {
  children: React.ReactNode
  session: Session | null
  org: { id: string; name: string; slug: string } | null
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
        session={session}
        org={org}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <div
        className={cn(
          "min-h-screen transition-[padding-left] duration-300 ease-in-out",
          collapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <Header
          mobileSidebarOpen={mobileSidebarOpen}
          onMobileSidebarOpenChange={setMobileSidebarOpen}
          session={session}
        />
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}