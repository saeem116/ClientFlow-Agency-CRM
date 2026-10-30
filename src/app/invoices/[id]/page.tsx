import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

export const metadata = {
  title: "Invoice Details - ClientFlow",
  description: "View invoice details and payment information",
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const models = await getModels(session)
  const Invoice = models.Invoice
  const Client = models.Client
  const Payment = models.Payment
  const InvoiceLineItem = models.InvoiceLineItem

  // Reject malformed ObjectIds cleanly (Mongoose CastError would otherwise
  // surface as a 500). A non-existent or inaccessible record returns 404.
  const mongoose = await import("mongoose")
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound()
  }

  const invoice = await Invoice.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
    _id: { toString(): string }
    number: string
    status: string
    total: number
    paidAmount: number
    dueDate?: Date | null
    issueDate: Date
    clientId: { toString(): string }
    organizationId: { toString(): string }
    notes?: string | null
  } | null

  if (!invoice) {
    notFound()
  }

  const payments = await Payment.find({ invoiceId: id }).lean()
  const lineItems = await InvoiceLineItem.find({ invoiceId: id }).lean()
  const client = await Client.findById(invoice.clientId).lean() as unknown as {
    _id: { toString(): string }
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
  } | null

  const balance = (invoice.total || 0) - (invoice.paidAmount || 0)
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "PAID" && invoice.status !== "VOIDED"

  const clientName = client
    ? client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed"
    : "Unknown"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">Invoice {invoice.number}</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">
            Created on {new Date(invoice.issueDate).toLocaleDateString()} • {clientName}
          </p>
        </div>
        <Link href="/invoices" className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--card)] px-4 py-2 text-sm font-medium text-slate-700 dark:text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-[var(--muted)]">
          ← Back to Invoices
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 dark:border-[var(--border)] p-4">
          <h3 className="font-medium text-slate-900 dark:text-[var(--foreground)] mb-3">Invoice Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-[var(--muted-foreground)]">Status:</span>
              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                invoice.status === "PAID" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                invoice.status === "OVERDUE" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                invoice.status === "PARTIALLY_PAID" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}>
                {invoice.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-[var(--muted-foreground)]">Total:</span>
              <span className="font-semibold">${invoice.total?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-[var(--muted-foreground)]">Paid:</span>
              <span className="font-semibold text-emerald-600">${invoice.paidAmount?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-[var(--muted-foreground)]">Balance:</span>
              <span className={`font-semibold ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                ${balance.toFixed(2)}
              </span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[var(--muted-foreground)]">Due Date:</span>
                <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ""}
                  {isOverdue && " (Overdue)"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-[var(--border)] p-4">
          <h3 className="font-medium text-slate-900 dark:text-[var(--foreground)] mb-3">Client Information</h3>
          <div className="flex items-center gap-2">
            <div>
              <p className="font-medium text-slate-900 dark:text-[var(--foreground)]">{clientName}</p>
              <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">{client?.email || "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-[var(--border)] p-4">
          <h3 className="font-medium text-slate-900 dark:text-[var(--foreground)] mb-3">Actions</h3>
          <div className="space-y-2">
            {balance > 0 && invoice.status !== "VOIDED" && (
              <a
                href={`/invoices/${invoice._id.toString()}/payment`}
                className="block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Record Payment
              </a>
            )}
            {invoice.status === "DRAFT" && (
              <a
                href={`/invoices/${invoice._id.toString()}/edit`}
                className="block w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--card)] px-4 py-2 text-center text-sm font-medium text-slate-700 dark:text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-[var(--muted)]"
              >
                Edit Invoice
              </a>
            )}
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-[var(--border)] p-4">
          <h3 className="font-medium text-slate-900 dark:text-[var(--foreground)] mb-3">Payment History</h3>
          <div className="space-y-3">
            {(payments as unknown as Array<{
              _id: { toString(): string };
              amount: number;
              date: Date;
              method: string;
            }>).map((payment: {
              _id: { toString(): string };
              amount: number;
              date: Date;
              method: string;
            }) => (
              <div key={payment._id.toString()} className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-[var(--muted)] p-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-[var(--foreground)]">${payment.amount?.toFixed(2) || "0.00"}</p>
                  <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">
                    {new Date(payment.date).toLocaleDateString()} • {payment.method || "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="rounded-lg border border-slate-200 dark:border-[var(--border)] p-4">
          <h3 className="font-medium text-slate-900 dark:text-[var(--foreground)] mb-3">Notes</h3>
          <p className="text-slate-600 dark:text-[var(--muted-foreground)]">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
