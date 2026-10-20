import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Client } from "@/lib/database"
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

  const client = await Client.findOne({ _id: id, organizationId: org.id }).lean()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  return NextResponse.json(client)
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

  const client = await Client.findOneAndUpdate(
    { _id: id, organizationId: org.id },
    {
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      companyName: body.companyName || null,
      email: body.email ? body.email.toLowerCase().trim() : null,
      phone: body.phone || null,
      website: body.website || null,
      address: body.address || null,
      city: body.city || null,
      country: body.country || null,
      status: body.status || "active",
      notes: body.notes || null,
    },
    { new: true, runValidators: true }
  ).lean()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  return NextResponse.json(client)
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

  const client = await Client.findOneAndDelete({ _id: id, organizationId: org.id })

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Client deleted successfully" })
}
