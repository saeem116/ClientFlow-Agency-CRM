import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Payment, Invoice, User, Membership } from "@/lib/database"
import { requireOrg, getSession } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

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

  // Check if invoice belongs to org
  const invoice = await Invoice.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
    _id: { toString(): string }
    number: string
    status: string
    total: number
    paidAmount: number
    clientId: { toString(): string }
    organizationId: { toString(): string }
    notes?: string | null
  } | null
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const amount = parseFloat((body.get("amount") as string) || "0")
  const method = (body.get("method") as string) || null
  const reference = (body.get("reference") as string) || null
  const notes = (body.get("notes") as string) || null

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 })
  }

  const payment = await Payment.create({
    amount,
    date: new Date(),
    method,
    reference,
    notes,
    invoiceId: id,
    organizationId: org.id,
  })

  // Update invoice paid amount
  const totalPaid = (invoice.paidAmount || 0) + payment.amount
  const statusUpdate = totalPaid >= invoice.total ? "PAID" : "PARTIALLY_PAID"

  await Invoice.findOneAndUpdate(
    { _id: id, organizationId: org.id },
    {
      paidAmount: totalPaid,
      status: statusUpdate,
    },
    { new: true }
  )

  // Notify organization admins about payment
  const session = await getSession()
  if (session) {
    const orgMembers = await Membership.find({ organizationId: org.id }).lean()
    for (const member of orgMembers) {
      if (member.userId.toString() !== session.user.id) {
        await createNotification({
          userId: member.userId.toString(),
          organizationId: org.id,
          type: "payment_received",
          title: "Payment Received",
          message: `$${payment.amount.toLocaleString()} received for invoice #${invoice.number}`,
          link: `/invoices/${id}`,
        })
      }
    }
  }

  // Redirect back to the invoice detail page on success.
  const returnTo = new URL(request.url).searchParams.get("returnTo")
  if (returnTo) {
    return NextResponse.redirect(new URL(returnTo, request.url))
  }

  return NextResponse.json({ id: payment._id.toString(), ...payment.toObject() })
}
