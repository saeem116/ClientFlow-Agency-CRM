"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatRelativeTime } from "@/lib/utils"
import { CheckSquare, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: Date | string | null
  project: {
    id: string
    name: string
  } | null
}

interface TaskListProps {
  tasks: Task[]
}

const priorityVariants: Record<string, "default" | "destructive" | "warning" | "info" | "success"> = {
  URGENT: "destructive",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "success",
  BACKLOG: "default",
}

const statusVariants: Record<string, "default" | "destructive" | "warning" | "info" | "success"> = {
  DONE: "success",
  IN_REVIEW: "warning",
  IN_PROGRESS: "info",
  BACKLOG: "default",
}

export function TaskList({ tasks: initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [, startTransition] = useTransition()

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "BACKLOG" : "DONE"

    // Optimistic update
    startTransition(() => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )
    })

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        // Revert on error
        startTransition(() => {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === taskId ? { ...task, status: currentStatus } : task
            )
          )
        })
      }
    } catch {
      // Revert on error
      startTransition(() => {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, status: currentStatus } : task
          )
        )
      })
    }
  }

  const isOverdue = (date: Date | string | null) => {
    if (!date) return false
    const d = typeof date === "string" ? new Date(date) : date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d < today
  }

  // Sort: overdue first, then by due date ascending
  const sortedTasks = [...tasks].sort((a, b) => {
    const aOverdue = isOverdue(a.dueDate)
    const bOverdue = isOverdue(b.dueDate)

    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1

    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Upcoming Tasks</CardTitle>
        <Link
          href="/tasks"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {sortedTasks.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            No tasks found
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <button
                  onClick={() => toggleTask(task.id, task.status)}
                  className={cn(
                    "flex-shrink-0 mt-1 w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600",
                    "hover:border-primary hover:bg-primary/10 transition-colors",
                    "flex items-center justify-center",
                    task.status === "DONE" && "bg-primary border-primary"
                  )}
                  aria-label={task.status === "DONE" ? "Mark incomplete" : "Mark complete"}
                >
                  {task.status === "DONE" && (
                    <CheckSquare className="w-3.5 h-3.5 text-primary-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium text-sm",
                      task.status === "DONE"
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {task.project && (
                      <Link
                        href={`/projects/${task.project.id}`}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary flex items-center gap-1"
                      >
                        <ChevronRight className="w-3 h-3" />
                        {task.project.name}
                      </Link>
                    )}
                    <Badge variant={priorityVariants[task.priority] || "default"}>
                      {task.priority}
                    </Badge>
                    <Badge variant={statusVariants[task.status] || "default"}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    {task.dueDate && (
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue(task.dueDate)
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {isOverdue(task.dueDate) ? "Overdue" : formatRelativeTime(task.dueDate)}
                        {" "}
                        <span className="font-normal text-slate-400 dark:text-slate-500">
                          ({formatDate(task.dueDate)})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}