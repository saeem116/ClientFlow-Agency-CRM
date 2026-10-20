import { ensureDb } from "@/lib/database"
import { Invoice, Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "New Invoice - ClientFlow",
  description: "Create a new invoice",
}

export default async function NewInvoicePage() {
  await ensureDb()
  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const clients = await Client.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New Invoice</h1>
          <p className="text-slate-500 mt-1">Create a new invoice for a client</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/invoices">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Information</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceForm org={org} clients={clients} />
        </CardContent>
      </Card>
    </div>
  )
}

function InvoiceForm({ org, clients }: {
  org: { id: string; name: string }
  clients: any[]
}) {
  return (
    <form action={createInvoice} className="space-y-6">
      <input type="hidden" name="organizationId" value={org.id} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client *</Label>
          <Select name="clientId" required>
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => {
                const name = client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed"
                return (
                  <SelectItem key={client._id.toString()} value={client._id.toString()}>{name}</SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="Payment terms, additional details..." />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" /> Create Invoice
        </Button>
      </div>
    </form>
  )
}

async function createInvoice(formData: FormData) {
  "use server"
  await ensureDb()
  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const clientId = formData.get("clientId") as string
  const dueDate = formData.get("dueDate") as string
  const notes = formData.get("notes") as string

  if (!clientId) throw new Error("Client is required")

  // Generate invoice number
  const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 }).lean()
  const currentYear = new Date().getFullYear()
  let nextNum = 1
  if (lastInvoice?.number) {
    const match = lastInvoice.number.match(/INV-\d{4}-(\d+)/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }
  const invoiceNumber = `INV-${currentYear}-${String(nextNum).padStart(4, "0")}`

  await Invoice.create({
    number: invoiceNumber,
    clientId,
    status: "DRAFT",
    issueDate: new Date(),
    dueDate: dueDate ? new Date(dueDate) : null,
    total: 0,
    notes: notes || null,
    organizationId: org.id,
  })

  redirect("/invoices")
}
