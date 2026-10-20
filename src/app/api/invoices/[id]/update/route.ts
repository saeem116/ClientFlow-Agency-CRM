import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Invoice, Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"

export async function POST(
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

  const { clientId, status, dueDate, total, notes } = body

  const invoice = await Invoice.findById(id).lean() as unknown as {
    _id: { toString(): string }
    number: string
    status: string
    total?: number | null
    paidAmount?: number | null
    dueDate?: Date | null
    clientId?: { toString(): string }
    organizationId: { toString(): string }
    notes?: string | null
  } | null
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  if (invoice.organizationId?.toString() !== org.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const updated = await Invoice.findByIdAndUpdate(
    id,
    {
      clientId,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
      total: parseFloat(total?.toString() || "0"),
      notes: notes || null,
    },
    { new: true, runValidators: true }
  ).lean()

  return NextResponse.json(updated)
}
