"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, FolderKanban, Calendar, Users, TrendingUp, CheckCircle, X, AlertCircle } from "lucide-react"
import { formatDate, formatCompactCurrency } from "@/lib/utils"
import Link from "next/link"

interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  priority: string
  budget?: number | null
  startDate?: Date | string | null
  endDate?: Date | string | null
  client: { id: string; name: string } | null
  tasks: { id: string; status: string }[]
  milestones: { id: string; completedAt?: Date | string | null }[]
}

interface ProjectsPageClientProps {
  projects: Project[]
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  DRAFT: { variant: "secondary", label: "Draft" },
  ON_HOLD: { variant: "warning", label: "On Hold" },
  COMPLETED: { variant: "default", label: "Completed" },
  CANCELLED: { variant: "destructive", label: "Cancelled" },
}

const priorityConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; label: string }> = {
  LOW: { variant: "info", label: "Low" },
  MEDIUM: { variant: "secondary", label: "Medium" },
  HIGH: { variant: "warning", label: "High" },
  URGENT: { variant: "destructive", label: "Urgent" },
}

export function ProjectsPageClient({ projects }: ProjectsPageClientProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredProjects = projects
    .filter((project) => {
      if (!search) return true
      const q = search.toLowerCase()
      const clientName = project.client?.name || ""
      return (
        project.name.toLowerCase().includes(q) ||
        (project.description || "").toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q)
      )
    })
    .filter((project) => {
      if (statusFilter === "all") return true
      return project.status === statusFilter
    })

  // Summary metrics calculated from actual project data
  const activeProjects = filteredProjects.filter((p) => p.status === "ACTIVE").length
  const completedProjects = filteredProjects.filter((p) => p.status === "COMPLETED").length
  const overdueProjects = filteredProjects.filter(
    (p) => p.endDate && new Date(p.endDate) < new Date() && p.status !== "COMPLETED" && p.status !== "CANCELLED"
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="text-slate-500 mt-1">Manage your agency's work from kickoff to delivery.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Link>
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Projects</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{filteredProjects.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FolderKanban className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{activeProjects}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{completedProjects}</p>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overdue</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{overdueProjects}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All Statuses
          </Button>
          <Button
            variant={statusFilter === "ACTIVE" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("ACTIVE")}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "PLANNING" || statusFilter === "DRAFT" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("DRAFT")}
          >
            Planning
          </Button>
          <Button
            variant={statusFilter === "ON_HOLD" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("ON_HOLD")}
          >
            On Hold
          </Button>
          <Button
            variant={statusFilter === "COMPLETED" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("COMPLETED")}
          >
            Completed
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects ({filteredProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">
                {projects.length === 0 ? "No projects yet" : "No projects found"}
              </h3>
              <p className="mt-2 text-slate-500">
                {projects.length === 0
                  ? "Create your first project to get started."
                  : "Try adjusting your search or create a new project."}
              </p>
              {projects.length === 0 && (
                <Button asChild className="mt-4">
                  <Link href="/projects/new">
                    <Plus className="mr-2 h-4 w-4" /> Add Project
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
                const statusCfg = statusConfig[project.status] || { variant: "secondary" as const, label: project.status }
                const priorityCfg = priorityConfig[project.priority] || { variant: "secondary" as const, label: project.priority }
                const totalTasks = project.tasks.length
                const completedTasks = project.tasks.filter((t) => t.status === "DONE").length
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                const totalMilestones = project.milestones.length
                const completedMilestones = project.milestones.filter((m) => m.completedAt != null).length
                const clientName = project.client?.name || "—"

                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className="block">
                    <div className="bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{project.name}</h3>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                        {project.description || "No description"}
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Users className="h-3.5 w-3.5" />
                          <span>{clientName}</span>
                        </div>
                        {project.budget && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Budget: {formatCompactCurrency(project.budget)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {project.startDate ? formatDate(project.startDate) : "—"} → {" "}
                            {project.endDate ? formatDate(project.endDate) : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Tasks: {completedTasks}/{totalTasks} ({progress}%)</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>Milestones: {completedMilestones}/{totalMilestones}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant={priorityCfg.variant} className="text-xs">{priorityCfg.label}</Badge>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}