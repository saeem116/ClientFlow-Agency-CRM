import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Task } from "@/lib/database"
import { getOrganization, requireOrg } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Authoritative tenant isolation: a task is only visible if it belongs to
  // the authenticated user's organization. Tasks without a project are still
  // scoped by organizationId, so cross-org access is impossible.
  const task = await Task.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
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

  const org = await requireOrg()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existingTask = await Task.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
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

  const task = await Task.findOneAndUpdate(
    { _id: id, organizationId: org.id },
    {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
    { new: true }
  ).lean()

  return NextResponse.json(task)
}