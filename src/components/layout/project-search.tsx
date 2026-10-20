"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, FolderKanban, Loader2, X } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface ProjectSearchResult {
  id: string
  title: string
  description?: string
  clientName: string
  status: string
  href: string
}

const statusConfig: Record<string, { variant: any; label: string }> = {
  DRAFT: { variant: "secondary", label: "Planning" },
  ACTIVE: { variant: "info", label: "In Progress" },
  ON_HOLD: { variant: "warning", label: "On Hold" },
  COMPLETED: { variant: "success", label: "Completed" },
  CANCELLED: { variant: "destructive", label: "Cancelled" },
}

export function ProjectSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProjectSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchResults = useCallback(async (q: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (q.length < 2) {
      setResults([])
      return
    }

    abortControllerRef.current = new AbortController()
    setIsLoading(true)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=project`, {
        signal: abortControllerRef.current.signal,
      })
      if (res.ok) {
        const data = await res.json()
        // Filter for project results only
        const projectResults = data.results?.filter((r: any) => r.type === "Project") || []
        setResults(projectResults)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Search error:", error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, fetchResults])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleClear = () => {
    setQuery("")
    setResults([])
    inputRef.current?.focus()
  }

  const handleResultClick = () => {
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  const hasResults = results.length > 0
  const showDropdown = isOpen && (query.length >= 2 || isLoading || hasResults)

  return (
    <div className="relative flex-1 max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search projects..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : hasResults ? (
            <div className="py-1">
              {results.map((result) => {
                const cfg = statusConfig[result.status] || { variant: "secondary", label: result.status }
                return (
                  <Link
                    key={result.id}
                    href={result.href}
                    onClick={handleResultClick}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
                  >
                    <span className="flex-shrink-0">
                      <FolderKanban className="h-4 w-4 text-violet-600" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-popover-foreground truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.clientName} • {cfg.label}
                      </p>
                    </div>
                    <Badge variant={cfg.variant} className="text-xs">
                      {cfg.label}
                    </Badge>
                  </Link>
                )
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-muted-foreground">
              No projects found for &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}