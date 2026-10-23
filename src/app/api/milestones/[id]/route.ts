import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Milestone, Project } from "@/lib/database"
import { requireOrg } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params
  const body = await request.json()

  const org = await requireOrg()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const update: Record<string, unknown> = {}

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "Title must be a non-empty string" }, { status: 400 })
    }
    update.title = body.title.trim()
  }
  if (body.description !== undefined) {
    update.description = typeof body.description === "string" ? body.description.trim() || null : null
  }
  if (body.dueDate !== undefined) {
    update.dueDate = body.dueDate ? new Date(body.dueDate) : null
  }
  if (body.completedAt !== undefined) {
    update.completedAt = body.completedAt ? new Date(body.completedAt) : null
  }
  if (body.projectId !== undefined) {
    if (body.projectId) {
      const project = await Project.findOne({ _id: body.projectId, organizationId: org.id }).lean()
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
    }
    update.projectId = body.projectId || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updated = await Milestone.findOneAndUpdate(
    { _id: id, projectId: { $in: (await Project.find({ organizationId: org.id }).select("_id").lean()).map((p: any) => p._id) } },
    update,
    { new: true, runValidators: true }
  ).lean()

  if (!updated) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params

  const org = await requireOrg()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projectIds = (await Project.find({ organizationId: org.id }).select("_id").lean()).map((p: any) => p._id)
  const milestone = await Milestone.findOneAndDelete({ _id: id, projectId: { $in: projectIds } })

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Milestone deleted successfully" })
}