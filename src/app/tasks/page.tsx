import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { redirect } from "next/navigation"
import { TasksPageClient } from "./tasks-page-client"

export default async function TasksPage() {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Task = models.Task
  const Project = models.Project
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  // Tasks are scoped by organizationId in the schema; query directly by org
  const tasks = await Task.find({ organizationId: org.id })
    .sort({ dueDate: 1, createdAt: -1 })
    .lean()
    .exec()

  return <TasksPageClient tasks={tasks.map((t: any) => ({
    id: t._id.toString(),
    title: t.title,
    description: t.description || null,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate || null,
    completedAt: t.completedAt || null,
    projectId: t.projectId?.toString() || null,
    assigneeId: t.assigneeId?.toString() || null,
  }))} />
}
