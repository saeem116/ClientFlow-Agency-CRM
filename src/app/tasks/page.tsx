import { ensureDb, Task, Project } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TasksPageClient } from "./tasks-page-client"

export default async function TasksPage() {
  await ensureDb()
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  // Find all projects for this org to scope tasks
  const projects = await Project.find({ organizationId: org.id }).select("_id").lean()
  const projectIds = projects.map((p: any) => p._id.toString())

  const tasks = await Task.find({
    $or: [
      { projectId: { $in: projectIds } },
      { projectId: null },
    ],
  })
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
