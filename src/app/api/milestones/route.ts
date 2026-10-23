import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Project, Milestone } from "@/lib/database"
import { getOrganization, requireOrg } from "@/lib/auth"

export async function GET(request: NextRequest) {
  await ensureDb()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const filter: Record<string, unknown> = { projectId }
  const milestones = await Milestone.find(filter)
    .sort({ createdAt: -1 })
    .lean()
    .exec()

  return NextResponse.json(milestones)
}

export async function POST(request: NextRequest) {
  await ensureDb()
  const body = await request.json()
  const org = await requireOrg()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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