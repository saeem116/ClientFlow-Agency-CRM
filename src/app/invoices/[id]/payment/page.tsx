import { ensureDb } from "@/lib/database"
import { Payment, Invoice, Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"

export const metadata = {
  title: "Record Payment - ClientFlow",
  description: "Record a payment for an invoice",
}

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const invoice = await Invoice.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
    _id: { toString(): string }
    number: string
    status: string
    total?: number | null
    paidAmount?: number | null
    clientId?: { toString(): string }
  } | null
  if (!invoice) notFound()

  const client = await Client.findById(invoice.clientId).lean() as unknown as {
    _id: { toString(): string }
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
  } | null
  const clientName = client
    ? client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed"
    : "Unknown"

  const balance = (invoice.total || 0) - (invoice.paidAmount || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Record Payment</h1>
          <p className="text-slate-500 mt-1">
            Invoice {invoice.number} • {clientName}
          </p>
        </div>
        <a href={`/invoices/${invoice._id.toString()}`} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </a>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-3">Invoice Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Total:</span>
            <span className="ml-2 font-semibold">${invoice.total?.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500">Paid:</span>
            <span className="ml-2 font-semibold text-emerald-600">${invoice.paidAmount?.toFixed(2) || "0.00"}</span>
          </div>
          <div>
            <span className="text-slate-500">Balance:</span>
            <span className="ml-2 font-semibold text-amber-600">${balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <PaymentForm invoiceId={id} balance={balance} />
    </div>
  )
}

function PaymentForm({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-6">
      <form action={`/api/invoices/${invoiceId}/payment`} method="POST">
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium text-slate-900">Payment Amount *</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              required
              defaultValue={balance}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="method" className="text-sm font-medium text-slate-900">Payment Method</label>
            <select
              name="method"
              defaultValue="BANK_TRANSFER"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="PAYPAL">PayPal</option>
              <option value="CASH">Cash</option>
              <option value="CHECK">Check</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="reference" className="text-sm font-medium text-slate-900">Reference</label>
            <input
              id="reference"
              name="reference"
              placeholder="Transaction ref, check #, etc."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-slate-900">Notes</label>
            <input
              id="notes"
              name="notes"
              placeholder="Optional notes"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Record Payment
          </button>
        </div>
      </form>
    </div>
  )
}
