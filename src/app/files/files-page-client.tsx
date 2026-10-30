"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react"

interface FileItem {
  id: string
  fileId: string
  originalFilename: string
  contentType: string
  size: number
  createdAt: string
}

interface FilesPageClientProps {
  initialFiles?: FileItem[]
  initialTotal?: number
}

export function FilesPageClient({
  initialFiles = [],
}: FilesPageClientProps) {
  const [files, setFiles] = useState<FileItem[]>(initialFiles)

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/files", { credentials: "include" })
      if (!response.ok) return
      const data = await response.json()
      setFiles(data.files || [])
    } catch {
      // Silently fail — keep the existing list rather than breaking the UI
    }
  }, [])

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const units = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  const handleUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", fileList[0])

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
      setTimeout(() => setSuccess(null), 3000)
      // Refresh the list in place instead of a full page reload.
      await fetchFiles()
    } catch {
      setError("Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [])

  const handleDelete = useCallback(async (fileId: string, filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return
    setDeletingId(fileId)
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
      setTimeout(() => setSuccess(null), 3000)
      // Refresh the list in place instead of a full page reload.
      await fetchFiles()
    } finally {
      setDeletingId(null)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      handleUpload(e.dataTransfer.files)
    },
    [handleUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={dragRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop a file here, or click to select
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Max 10 MB. Allowed: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX, XLS, XLSX, ZIP, RAR
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/json,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-rar-compressed"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
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
                  Select File
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg border border-success/30 bg-success/10 text-success">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No files yet</h3>
              <p className="text-muted-foreground">
                Upload your first file using the form above.
              </p>
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
                      disabled={deletingId === file.fileId}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === file.fileId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
