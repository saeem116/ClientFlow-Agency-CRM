import { ensureDb } from "@/lib/database"
import { Task } from "@/lib/database"
import Link from "next/link"

export const metadata = {
  title: "Task Details - ClientFlow",
  description: "View task details and update progress",
}

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const task = await Task.findById(id).lean() as unknown as {
    _id: { toString(): string }
    title: string
    status: string
    priority: string
    dueDate: Date | null
    completedAt: Date | null
    description: string | null
    createdAt: Date
    updatedAt: Date
    projectId: { toString(): string } | null
  } | null

  if (!task) {
    throw new Error("Task not found")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Task: {task.title}</h1>
          <p className="text-slate-500 mt-1">{task.projectId ? "Project Task" : "Standalone Task"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>←</span> Back to Tasks
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">Task Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Status</p>
              <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                task.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
                task.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                task.status === "IN_REVIEW" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-700"
              }`}>
                {task.status}
              </span>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Priority</p>
              <p className="font-medium text-slate-900">{task.priority}</p>
            </div>
            {task.dueDate && (
              <div>
                <p className="text-slate-500 mb-1">Due Date</p>
                <p className="font-medium text-slate-900">{new Date(task.dueDate).toLocaleDateString()}</p>
              </div>
            )}
            {task.completedAt && (
              <div>
                <p className="text-slate-500 mb-1">Completed On</p>
                <p className="font-medium text-slate-900">{new Date(task.completedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">Description</h3>
          {task.description ? (
            <p className="text-slate-600 whitespace-pre-wrap">{task.description}</p>
          ) : (
            <p className="text-slate-400 italic">No description provided.</p>
          )}
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
            {task.updatedAt > task.createdAt && (
              <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/tasks/${task._id.toString()}/edit`}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Edit Task
          </Link>
          {task.projectId && (
            <Link
              href={`/projects/${task.projectId.toString()}`}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View Project
            </Link>
          )}
          <Link
            href="/tasks"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to All Tasks
          </Link>
        </div>
      </div>
    </div>
  )
}
