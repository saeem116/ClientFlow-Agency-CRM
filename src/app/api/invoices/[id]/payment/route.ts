import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Payment, Invoice, User, Membership } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

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

  const { amount, method, reference, notes } = body

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 })
  }

  const payment = await Payment.create({
    amount: parseFloat(amount.toString()),
    date: new Date(),
    method: method || null,
    reference: reference || null,
    notes: notes || null,
    invoiceId: id,
  })

  // Update invoice paid amount
  const totalPaid = (invoice.paidAmount || 0) + payment.amount
  const statusUpdate = totalPaid >= invoice.total ? "PAID" : "PARTIALLY_PAID"
  const now = new Date()

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
        const memberUser = await User.findById(member.userId).lean()
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

  return NextResponse.json({ id: payment._id.toString(), ...payment.toObject() })
}
