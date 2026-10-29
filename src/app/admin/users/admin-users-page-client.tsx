"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Users, AlertCircle, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

interface SanitizedUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: string
  organizationRoles: Array<{ role: string; organizationId: string }>
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiData {
  users: SanitizedUser[]
  pagination: Pagination
}

interface Props {
  initialUsers: SanitizedUser[]
  pagination: Pagination
}

export function AdminUsersPageClient({ initialUsers, pagination }: Props) {
  const [users, setUsers] = useState<SanitizedUser[]>(initialUsers)
  const [paginationState, setPagination] = useState<Pagination>(pagination)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async (pageNum: number, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(paginationState.limit),
      })
      if (q.trim()) params.set("q", q.trim())

      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/sign-in"
          return
        }
        if (res.status === 403) {
          setError("Access denied. You are not authorized to view this page.")
          return
        }
        setError("Failed to load users. Please try again.")
        return
      }

      const data: ApiData = await res.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch {
      setError("Network error. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }, [paginationState.limit])

  const handleSearch = (value: string) => {
    setSearch(value)
    fetchUsers(1, value)
  }

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, search)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Admin Users
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage and view all registered users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {paginationState.total} users
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="search"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                {search ? "No users found" : "No users yet"}
              </h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {search
                  ? "Try adjusting your search terms."
                  : "Users will appear here as they register."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                        User
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                        Role
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                        Joined
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                              {user.name
                                ? user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)
                                : user.email[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {user.name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {user.email}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant={
                                user.role === "ADMIN" ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              Account: {user.role}
                            </Badge>
                            {user.organizationRoles.map((or, idx) => (
                              <Badge
                                key={`${or.organizationId}-${idx}`}
                                variant={
                                  or.role === "ADMIN" ? "outline" : "secondary"
                                }
                                className="text-xs gap-1"
                              >
                                Org: {or.role}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {formatDate(user.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {paginationState.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Showing{" "}
                    {(paginationState.page - 1) * paginationState.limit + 1}–
                    {Math.min(
                      paginationState.page * paginationState.limit,
                      paginationState.total
                    )}{" "}
                    of {paginationState.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePageChange(paginationState.page - 1)
                      }
                      disabled={paginationState.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Page {paginationState.page} of{" "}
                      {paginationState.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePageChange(paginationState.page + 1)
                      }
                      disabled={
                        paginationState.page >= paginationState.totalPages
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
