"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, CheckCircle2, Clock, TrendingUp, FileText, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Session } from "@/lib/auth"

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  createdAt: string
}

interface NotificationsListProps {
  _session?: Session | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NotificationsList({ _session }: NotificationsListProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchNotifications = useCallback(async (pageNum = 1) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/notifications?page=${pageNum}&limit=20`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/sign-in")
          return
        }
        throw new Error("Failed to load notifications")
      }
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
      setTotalPages(data.pagination?.totalPages || 1)
      setPage(data.pagination?.page || 1)
    } catch {
      setError("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [router])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchNotifications(1)
  }, [fetchNotifications])
  /* eslint-enable react-hooks/set-state-in-effect */

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Notifications</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)]">
            View and manage your notifications
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)] mt-2">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">
            {error}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchNotifications(page)}>
              Retry
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500" />
            <h3 className="mt-2 text-lg font-medium text-[var(--foreground)]">No notifications yet</h3>
            <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)] mt-1">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y divide-[var(--border)]">
                {notifications.map((notif) => {
                  const Icon = getIcon(notif.type)
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-[var(--accent)] transition-colors ${
                        !notif.read ? "bg-[var(--accent)]/50" : ""
                      }`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${getIconColor(notif.type)} dark:text-opacity-80`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-[var(--foreground)]">{notif.title}</p>
                          {notif.message && (
                            <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)] mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 dark:text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(notif.createdAt)}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                      {notif.link && (
                        <Link
                          href={notif.link}
                          className="text-sm text-primary hover:underline mt-2 block"
                        >
                          View details →
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => fetchNotifications(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => fetchNotifications(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Re-export formatRelativeTime for use in this file
function formatRelativeTime(dateString: string): string {
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