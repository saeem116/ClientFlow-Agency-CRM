import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Membership } from "@/lib/database"
import { getOrganization, requireOrg, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"

export async function GET(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Task = models.Task
  const Project = models.Project

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const projectId = searchParams.get("projectId")

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Tasks are scoped to the authenticated user's organization. This is the
  // authoritative tenant-isolation boundary: a user from Org A can never see
  // tasks belonging to Org B, even if they know a task's ID.
  const filter: Record<string, unknown> = { organizationId: org.id }

  if (projectId && projectId !== "null") {
    filter.projectId = projectId
  }

  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ]
  }

  const tasks = await Task.find(filter)
    .sort({ dueDate: 1, createdAt: -1 })
    .lean()
    .exec()

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Task = models.Task
  const Project = models.Project
  const org = await requireOrg()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, projectId, assigneeId, priority, dueDate } = body

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  // Verify project belongs to org if specified
  if (projectId) {
    const project = await Project.findOne({ _id: projectId, organizationId: org.id }).lean()
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
  }

  const task = await Task.create({
    title,
    description: description || null,
    projectId: projectId || null,
    assigneeId: assigneeId || null,
    priority: priority || "MEDIUM",
    dueDate: dueDate ? new Date(dueDate) : null,
    status: "BACKLOG",
    organizationId: org.id,
  })

  return NextResponse.json({ id: task._id.toString(), ...task.toObject() })
}