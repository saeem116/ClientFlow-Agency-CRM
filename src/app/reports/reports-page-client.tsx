"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

interface Lead {
  stage: string
  value: number | null
}

interface Project {
  status: string
}

interface Task {
  status: string
  dueDate: Date | null
}

interface Invoice {
  issueDate: Date
  status: string
  paidAmount: number | null
}


interface Client {
  status: string
}

interface ReportsPageClientProps {
  invoices: Invoice[]
  leads: Lead[]
  projects: Project[]
  tasks: Task[]
  clients: Client[]
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export function ReportsPageClient({ invoices, leads, projects, tasks, clients }: ReportsPageClientProps) {
  // Revenue over time (last 6 months)
  const now = new Date()
  const months: { month: string; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = d.toLocaleString("default", { month: "short", year: "numeric" })
    const monthRevenue = invoices
      .filter((inv) => {
        const issueDate = new Date(inv.issueDate)
        return issueDate.getMonth() === d.getMonth() && issueDate.getFullYear() === d.getFullYear() && inv.status === "PAID"
      })
      .reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0)
    months.push({ month: monthKey, revenue: monthRevenue })
  }

  // Lead conversion funnel
  const stageOrder = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"]
  const leadFunnel = stageOrder.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
    value: leads.filter((l) => l.stage === stage).reduce((sum, l) => sum + Number(l.value || 0), 0),
  }))

  // Projects by status
  const projectStatusCounts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const projectStatusData = Object.entries(projectStatusCounts).map(([status, count], i) => ({
    status,
    count,
    color: COLORS[i % COLORS.length],
  }))

  // Tasks completed vs pending
  const completedTasks = tasks.filter((t) => t.status === "DONE").length
  // const pendingTasks = tasks.filter((t) => t.status !== "DONE").length
  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length

  // Client activity
  const activeClients = clients.filter((c) => c.status === "active").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">Insights into your agency&apos;s performance</p>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Revenue (6mo)</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatCurrency(months.reduce((s, m) => s + m.revenue, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Lead Conversion Rate</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {leads.length > 0
                    ? ((leads.filter((l) => l.stage === "WON").length / leads.length) * 100).toFixed(1) + "%"
                    : "0%"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Projects</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {projects.filter((p) => p.status === "ACTIVE").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tasks Completed</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {completedTasks} / {tasks.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value).replace(/\.00$/, "")}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(Number(value) || 0), name]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Lead Funnel & Projects by Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leadFunnel.map((item, i) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-900">{item.stage.replace("_", " ")}</span>
                    <span className="text-slate-600">{item.count} leads • {formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${leadFunnel[0].count > 0 ? (item.count / leadFunnel[0].count) * 100 : 0}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(labelProps: any) => {
                      const { status, count } = labelProps as { status: string; count: number }
                      return `${status}: ${count}`
                    }}
                    labelLine={false}
                  >
                    {projectStatusData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => Number(value) || 0} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Task Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{completedTasks}</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {tasks.filter((t) => t.status === "IN_PROGRESS").length}
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-slate-500">Overdue</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{overdueTasks}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Client Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-slate-500">Total Clients</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{clients.length}</p>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-slate-500">Active Clients</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{activeClients}</p>
            </div>
            <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
              <p className="text-sm text-slate-500">Inactive Clients</p>
              <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                {clients.length - activeClients}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500">Total Leads</p>
              <p className="text-3xl font-bold text-slate-600 dark:text-slate-400">{leads.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}