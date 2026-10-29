import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Membership } from "@/lib/database"
import { getOrganization, requireOrg, getSession } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"
import { getModels } from "@/lib/database-scoped"

export async function GET(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Project = models.Project

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const status = searchParams.get("status")

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const filter: Record<string, unknown> = { organizationId: org.id }
  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ]
  }
  if (status && status !== "all") {
    filter.status = status
  }

  const projects = await Project.find(filter)
    .sort({ updatedAt: -1 })
    .lean()
    .exec()

  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Project = models.Project
  const org = await requireOrg()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, clientId, priority, budget, startDate, endDate, status } = body

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const project = await Project.create({
    name,
    description: description || null,
    clientId: clientId || null,
    priority: priority || "MEDIUM",
    budget: budget ? parseFloat(budget.toString()) : null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    status: status || "DRAFT",
    organizationId: org.id,
  })

  // Notify other org members about new project
  if (session) {
    const orgMembers = await Membership.find({ organizationId: org.id }).lean()
    for (const member of orgMembers) {
      if (member.userId.toString() !== session.user.id) {
        await createNotification({
          userId: member.userId.toString(),
          organizationId: org.id,
          type: "project_created",
          title: "New Project Created",
          message: `"${name}" has been created`,
          link: `/projects/${project._id}`,
        })
      }
    }
  }

  return NextResponse.json({ id: project._id.toString(), ...project.toObject() })
}
