import { NextRequest } from "next/server"
import { ensureDb, Client, Membership } from "@/lib/database"
import { getOrganization, requireOrg, getSession } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  await ensureDb()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  const org = await getOrganization()
  if (!org) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchQuery: Record<string, unknown> = { organizationId: org.id }

  if (query) {
    searchQuery.$or = [
      { firstName: { $regex: query, $options: "i" } },
      { lastName: { $regex: query, $options: "i" } },
      { companyName: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ]
  }

  const clients = await Client.find(searchQuery)
    .select("id firstName lastName companyName email phone status createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean()

  const results = clients.map((client: any) => ({
    id: (client.id as string) || client._id.toString(),
    name: client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed",
    email: client.email || "",
    phone: client.phone || null,
    companyName: client.companyName || null,
    status: client.status || "active",
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    projects: [],
    _count: { invoices: 0 },
  }))

  return Response.json(results)
}

export async function POST(request: NextRequest) {
  await ensureDb()
  const body = await request.json()
  const org = await requireOrg()

  if (!org) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { firstName, lastName, companyName, email, phone, website, address, city, country, notes, status } = body

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 })
  }

  const client = await Client.create({
    firstName: firstName || null,
    lastName: lastName || null,
    companyName: companyName || null,
    email: email.toLowerCase().trim(),
    phone: phone || null,
    website: website || null,
    address: address || null,
    city: city || null,
    country: country || null,
    notes: notes || null,
    status: status || "active",
    organizationId: org.id,
    createdById: null,
  })

  // Notify other org members about new client
  const session = await getSession()
  if (session) {
    const orgMembers = await Membership.find({ organizationId: org.id }).lean()
    for (const member of orgMembers) {
      if (member.userId.toString() !== session.user.id) {
        await createNotification({
          userId: member.userId.toString(),
          organizationId: org.id,
          type: "client_created",
          title: "New Client Added",
          message: `${client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.email} has been added as a client`,
          link: `/clients/${client._id}`,
        })
      }
    }
  }

  return Response.json({
    id: client._id.toString(),
    ...(client as any).toObject ? (client as any).toObject() : client,
  })
}