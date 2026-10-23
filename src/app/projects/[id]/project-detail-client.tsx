"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Trash2,
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [localTasks, setLocalTasks] = useState<any[]>(project.tasks || [])
  const [milestones, setMilestones] = useState<any[]>(project.milestones || [])
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null)
  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", dueDate: "" })
  const [savingMilestone, setSavingMilestone] = useState(false)
  const [milestoneError, setMilestoneError] = useState<string | null>(null)
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null)

  // Calculate task progress
  const totalTasks = localTasks.length || 0
  const completedTasks = localTasks.filter((t: any) => t.status === "DONE").length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate milestone progress
  const totalMilestones = milestones.length || 0
  const completedMilestones = milestones.filter((m: any) => m.completedAt).length || 0

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

  const openMilestoneForm = (milestone?: any) => {
    if (milestone) {
      setEditingMilestone(milestone)
      setMilestoneForm({
        title: milestone.title || "",
        description: milestone.description || "",
        dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().slice(0, 10) : "",
      })
    } else {
      setEditingMilestone(null)
      setMilestoneForm({ title: "", description: "", dueDate: "" })
    }
    setMilestoneError(null)
    setShowMilestoneForm(true)
  }

  const closeMilestoneForm = () => {
    setShowMilestoneForm(false)
    setEditingMilestone(null)
    setMilestoneForm({ title: "", description: "", dueDate: "" })
    setMilestoneError(null)
  }

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!milestoneForm.title.trim()) {
      setMilestoneError("Title is required")
      return
    }
    setSavingMilestone(true)
    setMilestoneError(null)
    try {
      const body = {
        title: milestoneForm.title.trim(),
        description: milestoneForm.description.trim() || null,
        dueDate: milestoneForm.dueDate || null,
        projectId: project.id,
      }
      const url = editingMilestone
        ? `/api/milestones/${editingMilestone.id}`
        : "/api/milestones"
      const method = editingMilestone ? "PATCH" : "POST"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) {
        setMilestoneError(data.error || "Failed to save milestone")
        return
      }
      if (editingMilestone) {
        setMilestones((prev) =>
          prev.map((m) => (m.id === editingMilestone.id ? { ...m, ...data } : m))
        )
      } else {
        setMilestones((prev) => [...prev, data])
      }
      closeMilestoneForm()
    } catch (error) {
      console.error("Error saving milestone:", error)
      setMilestoneError("Failed to save milestone. Please try again.")
    } finally {
      setSavingMilestone(false)
    }
  }

  const handleToggleComplete = async (milestone: any) => {
    const newCompletedAt = milestone.completedAt ? null : new Date().toISOString()
    try {
      const response = await fetch(`/api/milestones/${milestone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: newCompletedAt }),
      })
      if (!response.ok) {
        console.error("Failed to update milestone completion")
        return
      }
      const updated = await response.json()
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestone.id ? { ...m, ...updated } : m))
      )
    } catch (error) {
      console.error("Error updating milestone:", error)
    }
  }

  const handleDeleteMilestone = async (milestone: any) => {
    if (!confirm(`Delete milestone "${milestone.title}"? This cannot be undone.`)) return
    setDeletingMilestoneId(milestone.id)
    try {
      const response = await fetch(`/api/milestones/${milestone.id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Failed to delete milestone")
        return
      }
      setMilestones((prev) => prev.filter((m) => m.id !== milestone.id))
    } catch (error) {
      console.error("Error deleting milestone:", error)
      alert("Failed to delete milestone. Please try again.")
    } finally {
      setDeletingMilestoneId(null)
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
                <Button size="sm" variant="outline" onClick={() => openMilestoneForm()}>
                  <Plus className="mr-2 h-4 w-4" /> Add Milestone
                </Button>
              </div>

              {milestones.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                    No milestones yet
                  </h3>
                  <p className="mt-2 text-slate-500">Milestones help track project phases.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map((milestone: any) => {
                    const isComplete = !!milestone.completedAt
                    const isDeleting = deletingMilestoneId === milestone.id

                    return (
                      <div
                        key={milestone.id}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-lg"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(milestone)}
                          className="flex-shrink-0"
                          aria-label={isComplete ? "Mark incomplete" : "Mark complete"}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-primary" />
                          )}
                        </button>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => openMilestoneForm(milestone)}
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-slate-900 dark:text-slate-100">
                              {milestone.title}
                            </h5>
                            {milestone.dueDate && (
                              <span className="text-xs text-slate-500">
                                Due: {formatDate(milestone.dueDate)}
                              </span>
                            )}
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMilestoneForm(milestone)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={isDeleting}
                          onClick={() => handleDeleteMilestone(milestone)}
                        >
                          {isDeleting ? (
                            <span className="text-xs">Deleting…</span>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Milestone Form Dialog */}
          {showMilestoneForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeMilestoneForm}
              />
              <div className="relative w-full max-w-lg bg-white dark:bg-[var(--card)] rounded-xl border border-slate-200 dark:border-[var(--border)] shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {editingMilestone ? "Edit Milestone" : "Add Milestone"}
                  </h3>
                  <button
                    onClick={closeMilestoneForm}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveMilestone} className="space-y-4">
                  {milestoneError && (
                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md p-2">
                      {milestoneError}
                    </p>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="milestone-title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Title *
                    </label>
                    <Input
                      id="milestone-title"
                      value={milestoneForm.title}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                      placeholder="Milestone title"
                      disabled={savingMilestone}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="milestone-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Description
                    </label>
                    <Textarea
                      id="milestone-description"
                      value={milestoneForm.description}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                      placeholder="Milestone details..."
                      disabled={savingMilestone}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="milestone-dueDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Due Date
                    </label>
                    <Input
                      id="milestone-dueDate"
                      type="date"
                      value={milestoneForm.dueDate}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                      disabled={savingMilestone}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={closeMilestoneForm} disabled={savingMilestone}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingMilestone}>
                      {savingMilestone ? "Saving…" : editingMilestone ? "Save Changes" : "Create Milestone"}
                    </Button>
                  </div>
                </form>
              </div>
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