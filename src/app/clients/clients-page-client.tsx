"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Users, Plus, Search, MoreHorizontal, Trash2, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

interface Client {
  id: string
  name: string
  email: string
  phone?: string | null
  companyName?: string | null
  status: string
  updatedAt: Date | string
  projects: { id: string; name: string; status: string }[]
  _count: { invoices: number }
}

interface ClientsPageClientProps {
  clients: Client[]
}

export function ClientsPageClient({ clients }: ClientsPageClientProps) {
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const filteredClients = clients.filter((client) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      client.name.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q) ||
      (client.companyName || "").toLowerCase().includes(q) ||
      (client.phone || "").toLowerCase().includes(q)
    )
  })

  const handleDeleteClient = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/clients/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Failed to delete client")
        return
      }
      setDeleteTarget(null)
      router.refresh()
    } catch {
      alert("Failed to delete client. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Clients</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">Manage your client relationships</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="mr-2 h-4 w-4" /> New Client
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[var(--input)] border border-slate-200 dark:border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Button variant="outline">Filter</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-[var(--foreground)]">
                {clients.length === 0 ? "No clients yet" : "No clients found"}
              </h3>
              <p className="mt-2 text-slate-500 dark:text-[var(--muted-foreground)]">
                {clients.length === 0
                  ? "Get started by adding your first client."
                  : "Try adjusting your search or create a new client."}
              </p>
              {clients.length === 0 && (
                <Button asChild className="mt-4">
                  <Link href="/clients/new">
                    <Plus className="mr-2 h-4 w-4" /> Add Client
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[var(--border)]">
                    <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Client</th>
                    <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Email</th>
                    <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Company</th>
                    <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Projects</th>
                    <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Invoices</th>
                    <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Status</th>
                    <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Last Contact</th>
                    <th className="text-right p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-[var(--muted)]">
                      <td className="p-4">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-[var(--foreground)] hover:text-primary transition-colors"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-[var(--muted-foreground)]">{client.email}</td>
                      <td className="p-4 text-slate-600 dark:text-[var(--muted-foreground)]">{client.companyName || "—"}</td>
                      <td className="p-4 text-slate-600 dark:text-[var(--muted-foreground)]">{client.projects.length}</td>
                      <td className="p-4 text-slate-600 dark:text-[var(--muted-foreground)]">{client._count.invoices}</td>
                      <td className="p-4">
                        <Badge variant={client.status === "active" ? "success" : "secondary"}>
                          {client.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-[var(--muted-foreground)]">
                        {formatDate(client.updatedAt)}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/clients/${client.id}`} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive cursor-pointer focus:text-destructive"
                              onClick={() => setDeleteTarget(client)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete client?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all of their
              associated data including projects, invoices, and files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}