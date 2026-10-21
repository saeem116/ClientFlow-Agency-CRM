import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Lead, Client } from "@/lib/database"
import { requireOrg } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params

  const org = await requireOrg()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Authoritative tenant isolation: a lead is only visible if it belongs to
  // the authenticated user's organization.
  const lead = await Lead.findOne({ _id: id, organizationId: org.id }).lean()

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  return NextResponse.json(lead)
}

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

  const validStages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"]
  const validSources = ["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "EMAIL", "PHONE", "OTHER"]

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
  if (body.email !== undefined) {
    update.email = body.email ? body.email.toLowerCase().trim() : null
  }
  if (body.phone !== undefined) {
    update.phone = body.phone ? body.phone.trim() : null
  }
  if (body.stage !== undefined) {
    if (!validStages.includes(body.stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
    }
    update.stage = body.stage
  }
  if (body.source !== undefined) {
    if (body.source !== null && !validSources.includes(body.source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 })
    }
    update.source = body.source || null
  }
  if (body.value !== undefined) {
    update.value = body.value ? parseFloat(body.value.toString()) : null
  }
  if (body.notes !== undefined) {
    update.notes = body.notes ? body.notes.trim() || null : null
  }
  if (body.followUpAt !== undefined) {
    update.followUpAt = body.followUpAt ? new Date(body.followUpAt) : null
  }
  if (body.clientId !== undefined) {
    if (body.clientId) {
      const client = await Client.findOne({ _id: body.clientId, organizationId: org.id }).lean()
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 })
      }
    }
    update.clientId = body.clientId || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updated = await Lead.findOneAndUpdate(
    { _id: id, organizationId: org.id },
    update,
    { new: true, runValidators: true }
  ).lean()

  if (!updated) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
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

  const lead = await Lead.findOneAndDelete({ _id: id, organizationId: org.id })

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Lead deleted successfully" })
}