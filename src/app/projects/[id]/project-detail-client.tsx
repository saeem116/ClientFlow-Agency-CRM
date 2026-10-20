"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FolderKanban,
  Edit,
  Calendar,
  TrendingUp,
  CheckCircle2,
  X,
  Plus,
  ChevronLeft,
  AlertCircle,
  Clock,
  User,
  MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ProjectDetailClientProps {
  project: any
}

const statusConfig: Record<string, { variant: any; label: string; color: string }> = {
  DRAFT: { variant: "secondary", label: "Planning", color: "text-slate-600" },
  ACTIVE: { variant: "info", label: "In Progress", color: "text-blue-600" },
  ON_HOLD: { variant: "warning", label: "On Hold", color: "text-amber-600" },
  COMPLETED: { variant: "success", label: "Completed", color: "text-emerald-600" },
  CANCELLED: { variant: "destructive", label: "Cancelled", color: "text-red-600" },
}

const priorityConfig: Record<string, { variant: any; label: string }> = {
  LOW: { variant: "info", label: "Low" },
  MEDIUM: { variant: "secondary", label: "Medium" },
  HIGH: { variant: "warning", label: "High" },
  URGENT: { variant: "destructive", label: "Urgent" },
}

export function ProjectDetailPageClient({ project }: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [localTasks, setLocalTasks] = useState<any[]>(project.tasks || [])

  // Calculate task progress
  const totalTasks = localTasks.length || 0
  const completedTasks = localTasks.filter((t: any) => t.status === "DONE").length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate milestone progress
  const totalMilestones = project.milestones?.length || 0
  const completedMilestones = project.milestones?.filter((m: any) => m.completedAt).length || 0

  // Overdue check
  const statusCfg = statusConfig[project.status] || { variant: "secondary", label: project.status, color: "text-slate-600" }
  const priorityCfg = priorityConfig[project.priority] || { variant: "secondary", label: project.priority }
  const isOverdue =
    project.endDate &&
    new Date(project.endDate) < new Date() &&
    project.status !== "COMPLETED" &&
    project.status !== "CANCELLED"

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "BACKLOG" : "DONE"

    try {
      // Call the API to update the task
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      const updatedTask = await response.json()

      // Update local state
      setLocalTasks((prev: any[]) => prev.map((task: any) =>
        task.id === taskId ? { ...task, status: updatedTask.status } : task
      ))
    } catch (error) {
      console.error("Error updating task:", error)
      // Optionally show error toast/notification
    }
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <FolderKanban className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {project.name}
              </h1>
              <Badge variant={statusCfg.variant}>
                {statusCfg.label}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Overdue
                </Badge>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {project.clientName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projects/${project.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Edit Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Project Progress</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {completedTasks}/{totalTasks} tasks ({progress}%)
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Budget</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {project.budget ? formatCurrency(project.budget) : "—"}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tasks</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {completedTasks}/{totalTasks}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Milestones</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {completedMilestones}/{totalMilestones}
                </p>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Priority</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {priorityCfg.label}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">Project Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Start Date</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {project.startDate ? formatDate(project.startDate) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Due Date</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {project.endDate ? formatDate(project.endDate) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Client</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {project.clientName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">Description</h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    {project.description || "No description provided."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Project Tasks</h4>
                <Button size="sm" asChild>
                  <Link href={`/tasks/new?projectId=${project.id}`}>
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                  </Link>
                </Button>
              </div>

              {localTasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                    No tasks yet
                  </h3>
                  <p className="mt-2 text-slate-500">Add tasks to track project progress.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {localTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={task.status === "DONE"}
                            onChange={() => handleTaskToggle(task.id, task.status)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={
                              task.status === "DONE"
                                ? "line-through text-slate-400"
                                : "font-medium text-slate-900 dark:text-slate-100"
                            }
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.assignee && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <User className="h-3 w-3" />
                              {task.assignee.name || task.assignee.email}
                            </div>
                          )}
                          {task.dueDate && (
                            <span className="text-xs text-slate-500">
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/tasks/${task.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === "milestones" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Project Milestones</h4>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Add Milestone
                </Button>
              </div>

              {project.milestones?.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                    No milestones yet
                  </h3>
                  <p className="mt-2 text-slate-500">Milestones help track project phases.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.milestones.map((milestone: any) => {
                    const milestoneTotalTasks = milestone.tasks?.length || 0
                    const milestoneCompletedTasks = milestone.tasks?.filter(
                      (t: any) => t.status === "DONE"
                    ).length || 0
                    const milestoneProgress =
                      milestoneTotalTasks > 0
                        ? Math.round((milestoneCompletedTasks / milestoneTotalTasks) * 100)
                        : 0
                    const isComplete = !!milestone.completedAt

                    return (
                      <div
                        key={milestone.id}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-slate-900 dark:text-slate-100">
                              {milestone.title}
                            </h5>
                            <span className="text-xs text-slate-500">
                              Tasks: {milestoneCompletedTasks}/{milestoneTotalTasks}
                            </span>
                          </div>
                          {milestone.dueDate && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              Due: {formatDate(milestone.dueDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100">Recent Activity</h4>
              {project.activities?.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                    No activity yet
                  </h3>
                  <p className="mt-2 text-slate-500">Activity will appear here as work progresses.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.activities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <MoreHorizontal className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}