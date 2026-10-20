import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelativeTime } from "@/lib/utils"
import Link from "next/link"
import {
  UserPlus,
  Briefcase,
  DollarSign,
  MessageSquare,
  CheckCircle,
  FileText,
  ArrowUpRight,
  Activity,
} from "lucide-react"

interface Activity {
  id: string
  type: string
  title: string
  description: string | null
  createdAt: Date | string
  client?: { id: string; firstName: string | null; lastName: string | null; companyName: string | null } | null
  project?: { id: string; name: string } | null
  lead?: { id: string; title: string } | null
}

const activityIcons: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  client_created: { icon: UserPlus, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  project_created: { icon: Briefcase, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  invoice_created: { icon: FileText, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  invoice_paid: { icon: DollarSign, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  lead_created: { icon: UserPlus, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  lead_status_changed: { icon: MessageSquare, color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
  task_completed: { icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  default: { icon: FileText, color: "text-slate-600", bgColor: "bg-slate-100 dark:bg-slate-800" },
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <Link
          href="/settings"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Activity className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No recent activity
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Activity will appear here as you create clients, projects, and invoices.
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto min-h-0 pr-1">
            <div className="space-y-4">
              {activities.slice(0, 8).map((activity) => {
                const iconConfig = activityIcons[activity.type] || activityIcons.default
                const Icon = iconConfig.icon

                return (
                  <Link
                    key={activity.id}
                    href={activity.client
                      ? `/clients/${activity.client.id}`
                      : activity.project
                      ? `/projects/${activity.project.id}`
                      : activity.lead
                      ? `/leads/${activity.lead.id}`
                      : "#"}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${iconConfig.bgColor} ${iconConfig.color}`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                          {activity.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span>{formatRelativeTime(activity.createdAt)}</span>
                        {activity.client && (
                          <>
                            <span>•</span>
                            <span className="text-primary hover:underline">
                              {activity.client.companyName || `${activity.client.firstName} ${activity.client.lastName}`}
                            </span>
                          </>
                        )}
                        {activity.project && (
                          <>
                            <span>•</span>
                            <span className="text-primary hover:underline">{activity.project.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}