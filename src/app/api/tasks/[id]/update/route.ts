import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Task, Project, Membership } from "@/lib/database"
import { requireOrg, getSession } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params
  const body = await request.formData()

  const org = await requireOrg()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const title = (body.get("title") as string) || ""
  const description = (body.get("description") as string) || null
  const status = (body.get("status") as string) || ""
  const priority = (body.get("priority") as string) || ""
  const dueDate = (body.get("dueDate") as string) || null
  const assigneeId = (body.get("assigneeId") as string) || null

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  // Fetch the task scoped to the authenticated organization. This is the
  // authoritative tenant-isolation check: a task from another organization
  // cannot be modified, even if its ID is known.
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

  // If the task belongs to a project, verify that project belongs to the same
  // organization (defense in depth; the orgId filter above is the primary gate).
  if (task.projectId) {
    const project = await Project.findOne({ _id: task.projectId, organizationId: org.id }).lean()
    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
  }

  const updated = await Task.findOneAndUpdate(
    { _id: id, organizationId: org.id },
    {
      title,
      description: description || null,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId || null,
      completedAt: status === "DONE" ? new Date() : null,
    },
    { new: true, runValidators: true }
  ).lean() as unknown as {
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
  }

  // Notify task assignee or org admins
  const session = await getSession()
  if (session && updated?.assigneeId) {
    const assigneeId = updated.assigneeId.toString()
    if (assigneeId !== session.user.id) {
      // Notify the assignee
      await createNotification({
        userId: assigneeId,
        organizationId: org.id,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You've been assigned: ${title}`,
        link: `/tasks/${id}`,
      })
    }
  } else if (session && status === "DONE") {
    // Notify org admins when a task is completed
    const orgMembers = await Membership.find({ organizationId: org.id }).lean()
    for (const member of orgMembers) {
      if (member.userId.toString() !== session.user.id) {
        await createNotification({
          userId: member.userId.toString(),
          organizationId: org.id,
          type: "task_completed",
          title: "Task Completed",
          message: `"${title}" has been marked as done`,
          link: `/tasks/${id}`,
        })
      }
    }
  }

  // Redirect back to the task detail page on success.
  const returnTo = new URL(request.url).searchParams.get("returnTo")
  if (returnTo) {
    return NextResponse.redirect(new URL(returnTo, request.url))
  }

  return NextResponse.json(updated)
}