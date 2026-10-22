/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Edit, Mail, Phone, MapPin, Globe, FileText, FolderKanban, DollarSign, Clock, MoreHorizontal, Upload, Trash2, Download, AlertCircle, CheckCircle2, Loader2, X, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils"

interface ClientFile {
  id: string
  fileId: string
  originalFilename: string
  contentType: string
  size: number
  createdAt: string
}

interface ClientDetailClientProps {
  client: any
  initialFiles?: ClientFile[]
}

export function ClientDetailPageClient({ client, initialFiles = [] }: ClientDetailClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [files, setFiles] = useState<ClientFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const units = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    setSuccess(null)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("clientId", client.id)
    try {
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Upload failed")
        return
      }
      setSuccess(`"${data.originalFilename}" uploaded successfully`)
      // Refresh files list
      const res = await fetch(`/api/files?clientId=${client.id}`, { credentials: "include" })
      if (res.ok) {
        const result = await res.json()
        setFiles(result.files || [])
      }
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError("Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (fileId: string, filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return
    try {
      const response = await fetch(`/api/files?fileId=${encodeURIComponent(fileId)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Delete failed")
        return
      }
      setSuccess(`"${filename}" deleted`)
      setFiles((prev) => prev.filter((f) => f.fileId !== fileId))
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError("Failed to delete file. Please try again.")
    }
  }

  const handleDeleteClient = async () => {
    setDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to delete client")
        return
      }
      router.push("/clients")
      router.refresh()
    } catch {
      setError("Failed to delete client. Please try again.")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  const totalBilled = client.invoices?.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0) || 0
  const totalPaid = client.invoices?.reduce((sum: number, inv: any) => sum + Number(inv.paidAmount || 0), 0) || 0
  const outstanding = totalBilled - totalPaid

  const activeProjects = client.projects?.filter((p: any) => p.status === "ACTIVE").length || 0
  const completedProjects = client.projects?.filter((p: any) => p.status === "COMPLETED").length || 0

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size="xl" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">{client.name}</h1>
              <Badge variant={client.status === "active" ? "success" : "secondary"}>{client.status}</Badge>
            </div>
            <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">{client.companyName || "Individual"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/clients/${client.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">Total Billed</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">{formatCurrency(totalBilled)}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">Total Paid</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">Outstanding</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">{formatCurrency(outstanding)}</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">Active Projects</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">{activeProjects}</p>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <FolderKanban className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 dark:text-[var(--foreground)]">Contact Information</h4>
                  <div className="space-y-3">
                    {client.email && (
                      <div className="flex items-center gap-3 text-slate-600 dark:text-[var(--muted-foreground)]">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-3 text-slate-600 dark:text-[var(--muted-foreground)]">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-3 text-slate-600 dark:text-[var(--muted-foreground)]">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{client.address}, {client.city || ""} {client.country || ""}</span>
                      </div>
                    )}
                    {client.website && (
                      <div className="flex items-center gap-3 text-slate-600 dark:text-[var(--muted-foreground)]">
                        <Globe className="h-4 w-4 text-slate-400" />
                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {client.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 dark:text-[var(--foreground)]">Quick Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-600 dark:text-[var(--muted-foreground)]">
                      <span>Projects</span>
                      <span className="font-medium">{client.projects?.length || 0} ({completedProjects} completed)</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-[var(--muted-foreground)]">
                      <span>Invoices</span>
                      <span className="font-medium">{client.invoices?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-[var(--muted-foreground)]">
                      <span>Leads</span>
                      <span className="font-medium">{client.leads?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-[var(--muted-foreground)]">
                      <span>Last Activity</span>
                      <span className="font-medium">
                        {client.activities?.[0] ? formatRelativeTime(client.activities[0].createdAt) : "Never"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {client.notes && (
                <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <h4 className="font-medium text-slate-900 dark:text-[var(--foreground)]">Notes</h4>
                  <p className="text-slate-600 dark:text-slate-400">{client.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              {!client.projects || client.projects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderKanban className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-[var(--foreground)]">No projects yet</h3>
                  <p className="mt-2 text-slate-500 dark:text-[var(--muted-foreground)]">Create a project for this client.</p>
                  <Button asChild className="mt-4">
                    <Link href={`/projects/new?clientId=${client.id}`}>
                      <Plus className="mr-2 h-4 w-4" /> New Project
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.projects.map((project: any) => {
                    const completedTasks = project.tasks?.filter((t: any) => t.status === "DONE").length || 0
                    const totalTasks = project.tasks?.length || 0
                    const completedMilestones = project.milestones?.filter((m: any) => m.completedAt).length || 0
                    const totalMilestones = project.milestones?.length || 0

                    return (
                      <Link key={project.id} href={`/projects/${project.id}`} className="block">
                        <div className="p-4 bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-lg hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 dark:text-slate-100">{project.name}</h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{project.description || "No description"}</p>
                            </div>
                            <Badge variant={project.status === "ACTIVE" ? "success" : project.status === "COMPLETED" ? "default" : "warning"}>
                              {project.status}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                            <span>Tasks: {completedTasks}/{totalTasks}</span>
                            <span>Milestones: {completedMilestones}/{totalMilestones}</span>
                            <span>{project.endDate ? `Due: ${formatDate(project.endDate)}` : "No deadline"}</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div className="space-y-4">
              {!client.invoices || client.invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-[var(--foreground)]">No invoices yet</h3>
                  <p className="mt-2 text-slate-500 dark:text-[var(--muted-foreground)]">Create an invoice for this client.</p>
                  <Button asChild className="mt-4">
                    <Link href={`/invoices/new?clientId=${client.id}`}>
                      <Plus className="mr-2 h-4 w-4" /> New Invoice
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Invoice #</th>
                        <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Date</th>
                        <th className="text-right p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Total</th>
                        <th className="text-right p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Paid</th>
                        <th className="text-right p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Balance</th>
                        <th className="text-left p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Status</th>
                        <th className="text-right p-4 font-medium text-slate-500 dark:text-[var(--muted-foreground)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {client.invoices.map((inv: any) => {
                        const statusConfig: Record<string, { variant: any }> = {
                          DRAFT: { variant: "secondary" },
                          SENT: { variant: "info" },
                          PARTIALLY_PAID: { variant: "warning" },
                          PAID: { variant: "success" },
                          OVERDUE: { variant: "destructive" },
                          VOIDED: { variant: "default" },
                        }
                        const cfg = statusConfig[inv.status] || { variant: "secondary" }
                        const balance = Number(inv.total) - Number(inv.paidAmount)

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-[var(--muted)]">
                            <td className="p-4 font-mono text-sm">{inv.number}</td>
                            <td className="p-4 text-slate-600 dark:text-[var(--muted-foreground)]">{formatDate(inv.issueDate)}</td>
                            <td className="p-4 text-right font-medium">{formatCurrency(inv.total)}</td>
                            <td className="p-4 text-right text-slate-600 dark:text-[var(--muted-foreground)]">{formatCurrency(inv.paidAmount)}</td>
                            <td className="p-4 text-right font-medium">{formatCurrency(balance)}</td>
                            <td className="p-4"><Badge variant={cfg.variant}>{inv.status}</Badge></td>
                            <td className="p-4 text-right">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/invoices/${inv.id}`}><FileText className="h-4 w-4" /></Link>
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop a file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Max 10 MB. Allowed: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX, XLS, XLSX
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file)
                  }}
                  disabled={uploading}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  type="button"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload File
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                  <button onClick={() => setError(null)} className="ml-auto">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-success/30 bg-success/10 text-success">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{success}</span>
                  <button onClick={() => setSuccess(null)} className="ml-auto">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* File List */}
              {files.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No files yet</h3>
                  <p className="text-muted-foreground">Upload files for this client.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        {getFileIcon(file.contentType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.originalFilename}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/files/${file.fileId}`}
                          download
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file.fileId, file.originalFilename)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              {!client.activities || client.activities.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-[var(--foreground)]">No activity yet</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MoreHorizontal className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</p>
                        <p className="text-sm text-slate-500">{activity.description || ""}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete client?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{client.name}</strong> and all of their
              associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
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