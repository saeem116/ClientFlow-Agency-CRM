import { ensureDb } from "@/lib/database"
import { Task, Project } from "@/lib/database"
import { getOrganization, requireOrg } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Save, X } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "New Task - ClientFlow",
  description: "Create a new task",
}

export default async function NewTaskPage() {
  await ensureDb()
  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const projects = await Project.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New Task</h1>
          <p className="text-slate-500 mt-1">Create a new task for your project</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/tasks">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Information</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm org={org} projects={projects} />
        </CardContent>
      </Card>
    </div>
  )
}

function TaskForm({ org, projects }: {
  org: { id: string; name: string }
  projects: any[]
}) {
  return (
    <form action={createTask} className="space-y-6">
      <input type="hidden" name="organizationId" value={org.id} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Task Title *</Label>
          <Input id="title" name="title" placeholder="Design new homepage layout" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select name="projectId">
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project._id.toString()} value={project._id.toString()}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue="MEDIUM">
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" placeholder="Task details and requirements..." />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" /> Create Task
        </Button>
      </div>
    </form>
  )
}

async function createTask(formData: FormData) {
  "use server"
  await ensureDb()
  const org = await requireOrg()
  if (!org) redirect("/sign-in")

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const projectId = formData.get("projectId") as string
  const priority = formData.get("priority") as string
  const dueDate = formData.get("dueDate") as string

  if (!title) throw new Error("Task title is required")

  await Task.create({
    title,
    description: description || null,
    projectId: projectId || null,
    priority: (priority as any) || "MEDIUM",
    dueDate: dueDate ? new Date(dueDate) : null,
    status: "BACKLOG",
    organizationId: org.id,
  })

  redirect("/tasks")
}
