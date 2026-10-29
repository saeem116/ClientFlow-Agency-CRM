import { NextRequest, NextResponse } from "next/server"
import { ensureDb } from "@/lib/database"
import { getOrganization, requireOrg, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"

export async function GET(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Project = models.Project
  const Milestone = models.Milestone

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Authoritative tenant isolation: milestones are scoped to projects in
  // the authenticated user's organization. A milestone from another org
  // cannot be discovered through its projectId alone.
  const filter: Record<string, unknown> = { projectId }
  if (projectId) {
    // Only return milestones whose project belongs to this org.
    const projectExists = await Project.exists({ _id: projectId, organizationId: org.id })
    if (!projectExists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    filter.projectId = projectId
  }

  const milestones = await Milestone.find(filter)
    .sort({ createdAt: -1 })
    .lean()
    .exec()

  return NextResponse.json(milestones)
}

export async function POST(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Project = models.Project
  const Milestone = models.Milestone
  const org = await requireOrg()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, projectId, dueDate } = body

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  if (!projectId) {
    return NextResponse.json({ error: "Project is required" }, { status: 400 })
  }

  // Verify the project belongs to the authenticated organization.
  const project = await Project.findOne({ _id: projectId, organizationId: org.id }).lean()
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const milestone = await Milestone.create({
    title: title.trim(),
    description: description ? String(description).trim() || null : null,
    projectId,
    dueDate: dueDate ? new Date(dueDate) : null,
  })

  return NextResponse.json({ id: milestone._id.toString(), ...milestone.toObject() })
}