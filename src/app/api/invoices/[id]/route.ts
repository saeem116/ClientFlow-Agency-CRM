import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Invoice, InvoiceLineItem, Payment } from "@/lib/database"
import { getOrganization, requireOrg } from "@/lib/auth"

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

  const invoice = await Invoice.findOne({ _id: id, organizationId: org.id }).lean()

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  // Fetch line items and payments separately
  const lineItems = await InvoiceLineItem.find({ invoiceId: id }).lean()
  const payments = await Payment.find({ invoiceId: id }).lean()

  return NextResponse.json({
    ...invoice,
    lineItems,
    payments,
  })
}

export async function POST(request: NextRequest) {
  await ensureDb()
  const body = await request.json()
  const org = await requireOrg()

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { clientId, dueDate, notes, lineItems: items } = body

  if (!clientId) {
    return NextResponse.json({ error: "Client is required" }, { status: 400 })
  }

  // Generate invoice number scoped to the authenticated organization. This
  // prevents cross-org number collisions and makes the sequence deterministic
  // per organization. A unique index on `number` provides the final safety
  // net against race conditions.
  const lastInvoice = await Invoice.findOne({
    organizationId: org.id,
  }).sort({ createdAt: -1 }).lean() as unknown as {
    number?: string
    createdAt?: Date
  } | null
  const currentYear = new Date().getFullYear()
  let nextNum = 1
  if (lastInvoice?.number) {
    const match = lastInvoice.number.match(/INV-\d{4}-(\d+)/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }
  const invoiceNumber = `INV-${currentYear}-${String(nextNum).padStart(4, "0")}`

  // Calculate totals from line items
  let subtotal = 0
  const invoiceLineItems = (items || []).map((item: Record<string, unknown>) => {
    const qty = parseFloat(item.quantity?.toString() || "1")
    const price = parseFloat(item.unitPrice?.toString() || "0")
    const amount = qty * price
    subtotal += amount
    return {
      description: item.description || "",
      quantity: qty,
      unitPrice: price,
      amount,
      invoiceId: "$$TEMP$$", // placeholder, will be set after creation
    }
  })

  const taxRate = parseFloat(body.taxRate?.toString() || "0")
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const invoice = await Invoice.create({
    number: invoiceNumber,
    clientId,
    status: "DRAFT",
    issueDate: new Date(),
    dueDate: dueDate ? new Date(dueDate) : null,
    total,
    subtotal,
    taxRate,
    taxAmount,
    paidAmount: 0,
    notes: notes || null,
    organizationId: org.id,
  })

  // Save line items
  for (const item of invoiceLineItems) {
    await InvoiceLineItem.create({
      ...item,
      invoiceId: invoice._id,
    })
  }

  return NextResponse.json({ id: invoice._id.toString(), ...invoice.toObject() })
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

  const invoice = await Invoice.findOne({ _id: id, organizationId: org.id })
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const updated = await Invoice.findOneAndUpdate(
    { _id: id, organizationId: org.id },
    {
      status: body.status || invoice.status,
      paidAmount: body.paidAmount !== undefined ? parseFloat(body.paidAmount.toString()) : invoice.paidAmount,
      dueDate: body.dueDate ? new Date(body.dueDate) : invoice.dueDate,
      notes: body.notes !== undefined ? body.notes : invoice.notes,
    },
    { new: true, runValidators: true }
  ).lean()

  return NextResponse.json(updated)
}