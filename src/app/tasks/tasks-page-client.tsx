"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, CheckSquare, Calendar, AlertTriangle, Square, RefreshCw, Eye, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  dueDate?: Date | string | null
  completedAt?: Date | string | null
  project?: { id: string; name: string } | null
  assignee?: { id: string; name: string | null; email: string } | null
}

interface TasksPageClientProps {
  tasks: Task[]
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; label: string; icon: React.ReactNode }> = {
  BACKLOG: { variant: "secondary", label: "Backlog", icon: <Square className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { variant: "info", label: "In Progress", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  IN_REVIEW: { variant: "warning", label: "In Review", icon: <Eye className="h-3.5 w-3.5" /> },
  DONE: { variant: "success", label: "Done", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
}

const priorityConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; label: string }> = {
  LOW: { variant: "info", label: "Low" },
  MEDIUM: { variant: "secondary", label: "Medium" },
  HIGH: { variant: "warning", label: "High" },
  URGENT: { variant: "destructive", label: "Urgent" },
}

export function TasksPageClient({ tasks }: TasksPageClientProps) {
  const [filter, setFilter] = useState<"all" | "my" | "overdue" | "upcoming" | "completed">("all")
  const [search, setSearch] = useState("")

  const filteredTasks = tasks.filter((task) => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === "my") return true
    if (filter === "overdue") return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"
    if (filter === "upcoming") return task.dueDate && new Date(task.dueDate) >= new Date() && task.status !== "DONE"
    if (filter === "completed") return task.status === "DONE"
    return true
  })

  const overdueCount = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Tasks</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">Stay on top of your work</p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[var(--input)] border border-slate-200 dark:border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: "all", label: "All" },
            { value: "my", label: "My Tasks" },
            { value: "overdue", label: `Overdue ${overdueCount > 0 ? `(${overdueCount})` : ""}` },
            { value: "upcoming", label: "Upcoming" },
            { value: "completed", label: "Completed" },
          ].map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value as "all" | "my" | "overdue" | "upcoming" | "completed")}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks ({filteredTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-[var(--foreground)]">No tasks found</h3>
              <p className="mt-2 text-slate-500">Try adjusting your filters or create a new task.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const statusCfg = statusConfig[task.status] || { variant: "secondary" as const, label: task.status, icon: <Square className="h-3.5 w-3.5" /> }
                const priorityCfg = priorityConfig[task.priority] || { variant: "secondary" as const, label: task.priority }
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"

                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-lg hover:border-primary/50 transition-colors ${isOverdue && task.status !== "DONE" ? "border-amber-300 dark:border-amber-700" : ""}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded ${statusCfg.variant === "success" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-[var(--muted)] dark:bg-[var(--muted)]"}`}>
                        {statusCfg.icon}
                      </div>
                      <div>
                        <h4 className={`font-medium text-[var(--foreground)] ${task.status === "DONE" ? "line-through text-[var(--muted-foreground)]" : ""}`}>
                          {task.title}
                        </h4>
                        {task.project && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {task.project.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={priorityCfg.variant} className="text-xs">
                        {priorityCfg.label}
                      </Badge>
                      {isOverdue && task.status !== "DONE" && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                      {task.dueDate && !isOverdue && task.status !== "DONE" && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </Badge>
                      )}
                      {task.status === "DONE" && task.completedAt && (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}