"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  Plus,
  User,
  LogOut,
  Settings as SettingsIcon,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { Avatar } from "@/components/ui/avatar"
import { GlobalSearch } from "./global-search"
import { signOut } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import { resolveDisplayName } from "@/lib/utils"
import type { Session } from "@/lib/auth"

interface RealNotification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  createdAt: string
}

export function Header({
  mobileSidebarOpen = false,
  onMobileSidebarOpenChange,
  session,
}: {
  mobileSidebarOpen?: boolean
  onMobileSidebarOpenChange?: (open: boolean) => void
  session: Session | null
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<RealNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefer the live client-side auth context: it is refreshed from
  // /api/auth/me after sign-in/sign-up/profile edits, so the header shows the
  // current user without a manual browser refresh. Fall back to the
  // server-rendered `session` prop for the initial paint.
  const { user: authUser } = useAuth()
  const currentUser = authUser ?? session?.user ?? null

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/notifications?page=1&limit=20")
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sign-in"
          return
        }
        throw new Error("Failed to load notifications")
      }
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      setError("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [])

  // Load notifications on mount and when bell is clicked
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications()
    }
  }, [showNotifications, fetchNotifications])

  // Poll for unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/notifications/unread-count")
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch {
        // Silently fail - don't break the UI
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const userName = resolveDisplayName({
    name: currentUser?.name ?? null,
    email: currentUser?.email ?? null,
  })
  const userEmail = currentUser?.email || ""
  const userAvatar = currentUser?.avatar || null

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, read: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      console.error("Failed to mark notification as read")
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      })
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        )
        setUnreadCount(0)
      }
    } catch {
      console.error("Failed to mark all as read")
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "payment_received":
        return CheckCircle2
      case "task_assigned":
      case "task_completed":
        return CheckCircle2
      case "client_created":
        return TrendingUp
      case "invoice_created":
        return FileText
      default:
        return Bell
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case "payment_received":
        return "text-emerald-500"
      case "task_assigned":
      case "task_completed":
        return "text-blue-500"
      case "client_created":
        return "text-purple-500"
      default:
        return "text-slate-500 dark:text-slate-400"
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 dark:bg-[var(--background)]/90 backdrop-blur-lg border-b border-[var(--border)] px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
      {/* Left side - title and mobile menu */}
      <div className="flex items-center gap-4">
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => onMobileSidebarOpenChange?.(!mobileSidebarOpen)}
        >
          {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="hidden lg:block">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">ClientFlow</h1>
        </div>
      </div>

      {/* Center - search */}
      <div className="flex-1 max-w-lg hidden md:block">
        <GlobalSearch />
      </div>

      {/* Right side - actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-popover dark:bg-[var(--popover)] rounded-lg shadow-lg border border-[var(--border)] py-1 z-50">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <p className="text-sm font-semibold">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <ScrollArea className="max-h-80">
                <div className="py-1">
                  {loading && notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      Loading...
                    </div>
                  ) : error ? (
                    <div className="px-4 py-3 text-sm text-destructive text-center">
                      {error}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const Icon = getIcon(notif.type)
                      return (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 hover:bg-accent transition-colors ${
                            !notif.read ? "bg-accent/50" : ""
                          }`}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 ${getIconColor(notif.type)} dark:text-opacity-80`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{notif.title}</p>
                              {notif.message && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {notif.message}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(notif.createdAt)}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                            )}
                          </div>
                          {notif.link && (
                            <Link
                              href={notif.link}
                              className="text-xs text-primary hover:underline mt-1 block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View details →
                            </Link>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
              <div className="px-4 py-2 border-t border-[var(--border)]">
                <Link
                  href="/settings?tab=notifications"
                  className="text-xs text-center block text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNotifications(false)}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        <Button asChild>
          <Link href="/clients/new">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">New Client</span>
          </Link>
        </Button>

        <div className="relative ml-2">
          <button
            type="button"
            aria-label="User menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-accent transition-colors"
          >
            <Avatar name={userName} image={userAvatar} size="sm" />
            <span className="hidden lg:block text-sm font-medium text-foreground">
              {userName}
            </span>
          </button>

          {/* User dropdown */}
          {mobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-popover dark:bg-[var(--popover)] rounded-lg shadow-lg border border-[var(--border)] py-1 z-50">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-sm font-medium text-popover-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <SettingsIcon className="h-4 w-4" />
                  Settings
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </div>
              <div className="border-t border-[var(--border)] py-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
