import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Project } from "@/lib/database"
import { getOrganization } from "@/lib/auth"

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

  const project = await Project.findOne({ _id: id, organizationId: org.id }).lean()

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(
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

  const project = await Project.findOne({ _id: id, organizationId: org.id })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const updated = await Project.findOneAndUpdate(
    { _id: id, organizationId: org.id },
    {
      name: body.name || project.name,
      description: body.description !== undefined ? body.description : project.description,
      priority: body.priority || project.priority,
      status: body.status || project.status,
      clientId: body.clientId || project.clientId || null,
      startDate: body.startDate ? new Date(body.startDate) : project.startDate,
      endDate: body.endDate ? new Date(body.endDate) : project.endDate,
      budget: body.budget !== undefined ? parseFloat(body.budget.toString()) : project.budget,
    },
    { new: true, runValidators: true }
  ).lean()

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const project = await Project.findOneAndDelete({ _id: id, organizationId: org.id })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Project deleted successfully" })
}
