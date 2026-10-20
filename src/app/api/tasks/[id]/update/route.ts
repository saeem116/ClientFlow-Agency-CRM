import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Task, Project, Membership } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params
  const body = await request.json()

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, description, status, priority, dueDate, assigneeId } = body

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  // Verify project membership if projectId is being changed
  const task = await Task.findById(id).lean()
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (task.projectId) {
    const project = await Project.findOne({ _id: task.projectId, organizationId: org.id }).lean()
    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
  }

  const updated = await Task.findByIdAndUpdate(
    id,
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
  ).lean()

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

  return NextResponse.json(updated)
}
