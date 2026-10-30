import { NextRequest, NextResponse } from "next/server"
import { ensureDb } from "@/lib/database"
import { getSession, requireOrg } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { DemoAccountReadOnlyError } from "@/lib/demo-account"

interface ProjectIdLean {
  _id: { toString(): string }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const session = await getSession()

  // requireOrg() enforces both authentication and the shared-demo-account
  // read-only guard. For the demo account it throws DemoAccountReadOnlyError,
  // which we catch here and return as a clean 403 instead of letting it
  // propagate as an unhandled rejection (which Next.js would render as a 500).
  let org: Awaited<ReturnType<typeof requireOrg>>
  try {
    org = await requireOrg()
  } catch (err) {
    if (err instanceof DemoAccountReadOnlyError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    throw err
  }

  if (!org || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const models = await getModels(session)
  const Milestone = models.Milestone
  const Project = models.Project

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
    update.dueDate = body.dueDate ? new Date(body.dueDate as string) : null
  }
  if (body.completedAt !== undefined) {
    update.completedAt = body.completedAt ? new Date(body.completedAt as string) : null
  }
  if (body.projectId !== undefined) {
    if (body.projectId) {
      const project = await Project.findOne({ _id: body.projectId as string, organizationId: org.id }).lean()
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
    { _id: id, projectId: { $in: (await Project.find({ organizationId: org.id }).select("_id").lean()).map((p: ProjectIdLean) => p._id) } },
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

  const session = await getSession()

  // requireOrg() enforces both authentication and the shared-demo-account
  // read-only guard. For the demo account it throws DemoAccountReadOnlyError,
  // which we catch here and return as a clean 403 instead of letting it
  // propagate as an unhandled rejection (which Next.js would render as a 500).
  let org: Awaited<ReturnType<typeof requireOrg>>
  try {
    org = await requireOrg()
  } catch (err) {
    if (err instanceof DemoAccountReadOnlyError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    throw err
  }

  if (!org || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const models = await getModels(session)
  const Milestone = models.Milestone
  const Project = models.Project

  const projectIds = (await Project.find({ organizationId: org.id }).select("_id").lean()).map((p: ProjectIdLean) => p._id)
  const milestone = await Milestone.findOneAndDelete({ _id: id, projectId: { $in: projectIds } })

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Milestone deleted successfully" })
}
