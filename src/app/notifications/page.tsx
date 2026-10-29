import { Metadata } from "next"
import { Suspense } from "react"
import { NotificationsList } from "./notifications-list"

export const metadata: Metadata = {
  title: "Notifications | ClientFlow",
  description: "View all your notifications",
}

export default async function NotificationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<NotificationsLoading />}>
        <NotificationsList />
      </Suspense>
    </div>
  )
}

function NotificationsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 w-full bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}