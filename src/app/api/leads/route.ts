import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Membership } from "@/lib/database"
import { getOrganization, requireOrg, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"

export async function GET(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Lead = models.Lead

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const stage = searchParams.get("stage")

  const org = await getOrganization()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const filter: Record<string, unknown> = { organizationId: org.id }
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ]
  }
  if (stage && stage !== "all") {
    filter.stage = stage
  }

  const leads = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .lean()
    .exec()

  return NextResponse.json(leads)
}

export async function POST(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Lead = models.Lead
  const org = await requireOrg()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, email, phone, value, source, notes, followUpAt } = body

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const lead = await Lead.create({
    title,
    description: description || null,
    email: email || null,
    phone: phone || null,
    value: value ? parseFloat(value.toString()) : null,
    source: source || null,
    notes: notes || null,
    followUpAt: followUpAt ? new Date(followUpAt) : null,
    stage: "NEW",
    organizationId: org.id,
  })

  return NextResponse.json({ id: lead._id.toString(), ...lead.toObject() })
}
