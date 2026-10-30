import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { redirect } from "next/navigation"
import { InvoicesPageClient } from "./invoices-page-client"

export default async function InvoicesPage() {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Invoice = models.Invoice
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const invoices = await Invoice.find({ organizationId: org.id })
    .populate({ path: "clientId", select: "companyName firstName lastName" })
    .sort({ issueDate: -1 })
    .lean()
    .exec()

  // Normalize to match the Invoice interface in invoices-page-client
  interface InvoiceLean {
    _id: { toString(): string }
    number: string
    status: string
    issueDate: Date
    dueDate: Date | null
    total: number
    paidAmount: number
    notes: string | null
    subtotal: number
    taxRate: number
    taxAmount: number
    clientId: { toString(): string } | null
    organizationId: { toString(): string } | null
    client: {
      _id: { toString(): string }
      companyName: string | null
      firstName: string | null
      lastName: string | null
    } | null
  }
  const normalizedInvoices = (invoices as unknown as InvoiceLean[]).map((invoice: InvoiceLean) => ({
    id: invoice._id.toString(),
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate || null,
    total: invoice.total,
    paidAmount: invoice.paidAmount || 0,
    clientId: invoice.clientId?.toString() || "",
    organizationId: invoice.organizationId?.toString() || "",
    notes: invoice.notes || null,
    subtotal: invoice.subtotal || 0,
    taxRate: invoice.taxRate || 0,
    taxAmount: invoice.taxAmount || 0,
    client: {
      id:
        (invoice.clientId && typeof invoice.clientId === "object"
          ? (invoice.clientId as unknown as { _id?: { toString(): string }; id?: string })._id?.toString()
          : (invoice.clientId as unknown as { toString?: () => string }).toString?.() || "") || "",
      name:
        (invoice.clientId && typeof invoice.clientId === "object"
          ? (invoice.clientId as unknown as { companyName?: string | null; firstName?: string | null; lastName?: string | null }).companyName || (invoice.clientId as unknown as { firstName?: string | null; lastName?: string | null }).firstName || (invoice.clientId as unknown as { lastName?: string | null }).lastName || "Unnamed"
          : (invoice as unknown as { client?: { companyName?: string | null } }).client?.companyName || (invoice as unknown as { clientName?: string }).clientName || "Unnamed"),
    },
    payments: [],
  }))

  return <InvoicesPageClient invoices={normalizedInvoices} />
}
