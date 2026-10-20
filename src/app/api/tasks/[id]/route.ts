import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Task, Project } from "@/lib/database"
import { getOrganization } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params

  const task = await Task.findById(id).lean() as unknown as {
    _id: { toString(): string }
    title: string
    description?: string | null
    status: string
    priority: string
    projectId?: { toString(): string } | null
    assigneeId?: { toString(): string } | null
    dueDate?: Date | null
    completedAt?: Date | null
    createdAt?: Date
    updatedAt?: Date
  } | null

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Check project membership via org
  const org = await getOrganization()
  if (org && task.projectId) {
    const project = await Project.findOne({ _id: task.projectId, organizationId: org.id }).lean()
    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
  }

  return NextResponse.json(task)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params
  const body = await request.json()
  const { status } = body

  if (!["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const org = await getOrganization()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existingTask = await Task.findById(id).lean() as unknown as {
    _id: { toString(): string }
    title: string
    description?: string | null
    status: string
    priority: string
    projectId?: { toString(): string } | null
    assigneeId?: { toString(): string } | null
    dueDate?: Date | null
    completedAt?: Date | null
    createdAt?: Date
    updatedAt?: Date
  } | null

  if (!existingTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Check project membership
  if (existingTask.projectId) {
    const project = await Project.findOne({ _id: existingTask.projectId, organizationId: org.id }).lean()
    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
  }

  const task = await Task.findByIdAndUpdate(
    id,
    {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
    { new: true }
  ).lean()

  return NextResponse.json(task)
}
