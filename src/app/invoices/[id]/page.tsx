import { ensureDb } from "@/lib/database"
import { Invoice, Client, Payment, InvoiceLineItem } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"

export const metadata = {
  title: "Invoice Details - ClientFlow",
  description: "View invoice details and payment information",
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const org = await getOrganization()
  if (!org) redirect("/sign-in")

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
          <h1 className="text-2xl font-semibold text-slate-900">Invoice {invoice.number}</h1>
          <p className="text-slate-500 mt-1">
            Created on {new Date(invoice.issueDate).toLocaleDateString()} • {clientName}
          </p>
        </div>
        <a href="/invoices" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          ← Back to Invoices
        </a>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">Invoice Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                invoice.status === "PAID" ? "bg-emerald-100 text-emerald-700" :
                invoice.status === "OVERDUE" ? "bg-red-100 text-red-700" :
                invoice.status === "PARTIALLY_PAID" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-700"
              }`}>
                {invoice.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total:</span>
              <span className="font-semibold">${invoice.total?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid:</span>
              <span className="font-semibold text-emerald-600">${invoice.paidAmount?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Balance:</span>
              <span className={`font-semibold ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                ${balance.toFixed(2)}
              </span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ""}
                  {isOverdue && " (Overdue)"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">Client Information</h3>
          <div className="flex items-center gap-2">
            <div>
              <p className="font-medium text-slate-900">{clientName}</p>
              <p className="text-sm text-slate-500">{client?.email || "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">Actions</h3>
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
                className="block w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit Invoice
              </a>
            )}
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">Payment History</h3>
          <div className="space-y-3">
            {payments.map((payment: any) => (
              <div key={payment._id.toString()} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                <div>
                  <p className="font-medium text-slate-900">${payment.amount?.toFixed(2) || "0.00"}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(payment.date).toLocaleDateString()} • {payment.method || "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-3">Notes</h3>
          <p className="text-slate-600">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
