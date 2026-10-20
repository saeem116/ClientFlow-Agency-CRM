"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderKanban,
  CheckSquare,
  FilePlus2,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Building2,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { resolveDisplayName } from "@/lib/utils"
import type { Session } from "@/lib/auth"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/leads", label: "Leads", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/invoices", label: "Invoices", icon: FilePlus2 },
  { href: "/files", label: "Files", icon: FolderKanban },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar({
  mobileOpen = false,
  onMobileOpenChange,
  session,
  org,
  collapsed = false,
  onCollapsedChange,
}: {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  session: Session | null
  org: { id: string; name: string; slug: string } | null
  collapsed?: boolean
  onCollapsedChange?: (next: boolean) => void
}) {
  const pathname = usePathname()

  // Prefer the live client-side auth context so the sidebar reflects the
  // current user after sign-in/sign-up/profile edits without a refresh.
  const { user: authUser } = useAuth()
  const currentUser = authUser ?? session?.user ?? null

  const userName = resolveDisplayName({
    name: currentUser?.name ?? null,
    email: currentUser?.email ?? null,
  })
  const userEmail = currentUser?.email || ""
  const userAvatar = currentUser?.avatar || null
  const orgName = org?.name || "My Workspace"

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onMobileOpenChange?.(!mobileOpen)}
          className="bg-white shadow-md"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {/* Desktop toggle button for sidebar */}
      <div className="hidden lg:flex items-center justify-end p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          <span className="ml-2 text-sm">Toggle Sidebar</span>
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => onMobileOpenChange?.(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full flex flex-col transition-all duration-300 bg-[var(--card)] border-r border-[var(--border)] text-[var(--foreground)]",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-lg tracking-tight text-[var(--foreground)]">
                ClientFlow
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
            onClick={() => onCollapsedChange?.(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-5 w-5 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Organization Switcher */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-[var(--border)]">
            <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{orgName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Workspace</p>
              </div>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onMobileOpenChange?.(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors cursor-pointer">
            <Avatar name={userName} image={userAvatar} size="sm" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{userName}</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">{userEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}