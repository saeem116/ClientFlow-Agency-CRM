import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Users Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    <Skeleton className="h-4 w-12" />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    <Skeleton className="h-4 w-10" />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    <Skeleton className="h-4 w-12" />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    <Skeleton className="h-4 w-16" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        <Skeleton className="h-5 w-16 rounded" />
                        <Skeleton className="h-5 w-14 rounded" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}