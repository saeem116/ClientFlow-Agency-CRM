import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { notFound, redirect } from "next/navigation"
import { sanitize } from "@/lib/sanitize"

export const metadata = {
  title: "Edit Task - ClientFlow",
  description: "Edit task details and progress",
}

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const session = await getSession()
  const org = await getOrganization()
  if (!org || !session?.user) redirect("/sign-in")

  const models = await getModels(session)
  const Task = models.Task

  const rawTask = await Task.findById(id).lean()
  const task = sanitize(rawTask) as {
    _id: { toString(): string }
    title: string
    description?: string | null
    status: string
    priority: string
    dueDate?: Date | null
  } | null

  if (!task) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Task: {task.title}</h1>
        </div>
        <a href={`/tasks/${task._id.toString()}`} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </a>
      </div>

      <EditTaskForm task={task} />
    </div>
  )
}

function EditTaskForm({ task }: {
  task: {
    _id: { toString(): string };
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: Date | null;
  };
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-6">
      <form action={`/api/tasks/${task._id.toString()}/update?returnTo=/tasks/${task._id.toString()}`} method="POST">
        <input type="hidden" name="id" value={task._id.toString()} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="title" className="text-sm font-medium text-slate-900">Task Title *</label>
            <input
              id="title"
              name="title"
              defaultValue={task.title}
              placeholder="Enter task title"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="description" className="text-sm font-medium text-slate-900">Description</label>
            <textarea
              id="description"
              name="description"
              defaultValue={task.description || ""}
              placeholder="Describe the task..."
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium text-slate-900">Status *</label>
            <select
              name="status"
              defaultValue={task.status}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="BACKLOG">Backlog</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="priority" className="text-sm font-medium text-slate-900">Priority *</label>
            <select
              name="priority"
              defaultValue={task.priority}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium text-slate-900">Due Date</label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Update Task
          </button>
        </div>
      </form>
    </div>
  )
}
