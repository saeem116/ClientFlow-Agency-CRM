import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Task, Project } from "@/lib/database"
import { getOrganization } from "@/lib/auth"

export async function GET(request: NextRequest) {
  await ensureDb()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const projectId = searchParams.get("projectId")

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find all projects for this org to scope tasks
  const projects = await Project.find({ organizationId: org.id }).select("_id").lean()
  const projectIds = projects.map((p: any) => p._id.toString())

  const filter: Record<string, unknown> = {}
  if (projectIds.length > 0) {
    filter.projectId = { $in: projectIds }
  }
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
  const body = await request.json()
  const org = await getOrganization()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
  })

  return NextResponse.json({ id: task._id.toString(), ...task.toObject() })
}
