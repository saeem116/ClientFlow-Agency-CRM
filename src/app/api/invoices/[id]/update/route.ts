import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Invoice } from "@/lib/database"
import { requireOrg } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()
  const { id } = await params
  const body = await request.formData()

  const org = await requireOrg()
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const status = (body.get("status") as string) || undefined
  const dueDate = (body.get("dueDate") as string) || undefined
  const notes = (body.get("notes") as string) || undefined
  const total = (body.get("total") as string) || undefined
  const returnTo = new URL(request.url).searchParams.get("returnTo")

  const invoice = await Invoice.findOne({ _id: id, organizationId: org.id })
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : invoice.dueDate
  if (notes !== undefined) updates.notes = notes
  if (total !== undefined) updates.total = parseFloat(total)

  // Scope the update to the authenticated organization. Without the
  // organizationId filter, a user from Org A could mutate an invoice that
  // belongs to Org B simply by knowing its ID.
  const updated = await Invoice.findByIdAndUpdate(
    { _id: id, organizationId: org.id },
    updates,
    { new: true, runValidators: true }
  ).lean()

  // Redirect back to the invoice detail page on success.
  if (returnTo) {
    return NextResponse.redirect(new URL(returnTo, request.url))
  }

  return NextResponse.json(updated)
}
