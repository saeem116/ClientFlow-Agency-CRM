import { ensureDb } from "@/lib/database"
import {
  Client, Project, Invoice, Payment, Lead, Activity, Task,
} from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { KPICard } from "./kpi-cards"
import { RevenueChart } from "./revenue-chart"
import { LeadPipeline } from "./lead-pipeline"
import { TaskList } from "./task-list"
import { ActivityFeed } from "./activity-feed"
import { OutstandingPayments } from "./outstanding-payments"
import { Plus, Users, Briefcase, DollarSign, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  await ensureDb()
  const session = await getSession()
  if (!session?.user) {
    redirect("/sign-in")
  }

  const org = await getOrganization()
  if (!org) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-500">Please log in to view the dashboard</p>
      </div>
    )
  }

  const orgId = org.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  // Fetch all data in parallel
  const [
    activeClientsCount,
    activeProjectsCount,
    outstandingInvoices,
    paidInvoicesThisMonth,
    paymentsThisMonth,
    paidInvoicesLast6Months,
    leads,
    recentTasks,
    recentActivities,
    allInvoicesForOutstanding,
    activeClientsBeforeThisMonth,
    activeProjectsBeforeThisMonth,
  ] = await Promise.all([
    // Active clients count
    Client.countDocuments({ organizationId: orgId, status: "active" }),

    // Active projects count
    Project.countDocuments({ organizationId: orgId, status: "ACTIVE" }),

    // Outstanding invoices
    Invoice.find({
      organizationId: orgId,
      status: { $in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    })
      .sort({ dueDate: 1 })
      .lean(),

    // Paid invoice amounts this month
    Invoice.aggregate([
      {
        $match: {
          organizationId: orgId,
          status: "PAID",
          issueDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$paidAmount" } } },
    ]),

    // Payment amounts this month
    Payment.aggregate([
      {
        $lookup: {
          from: "invoices",
          localField: "invoiceId",
          foreignField: "_id",
          as: "invoice",
        },
      },
      { $unwind: "$invoice" },
      {
        $match: {
          "invoice.organizationId": orgId,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Paid invoices for last 6 months chart
    Invoice.find({
      organizationId: orgId,
      status: "PAID",
      issueDate: { $gte: sixMonthsAgo },
    })
      .select("issueDate paidAmount status")
      .lean(),

    // Leads by stage
    Lead.find({ organizationId: orgId }).select("stage value").lean(),

    // Recent tasks (overdue first, then due soon)
    Task.find({
      status: { $ne: "DONE" },
    })
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(20)
      .lean(),

    // Recent activities
    Activity.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    // All invoices for outstanding payments table
    Invoice.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .lean(),

    // Active clients before this month (for trend)
    Client.countDocuments({
      organizationId: orgId,
      status: "active",
      createdAt: { $lt: startOfMonth },
    }),

    // Active projects before this month (for trend)
    Project.countDocuments({
      organizationId: orgId,
      status: "ACTIVE",
      createdAt: { $lt: startOfMonth },
    }),
  ])

  // Calculate KPI values
  const outstandingTotal = (outstandingInvoices as any[]).reduce(
    (sum: number, inv: any) => sum + (inv.total || 0) - (inv.paidAmount || 0),
    0
  )

  const revenueThisMonth =
    (paidInvoicesThisMonth[0]?.total || 0) +
    (paymentsThisMonth[0]?.total || 0)

  // Lead pipeline data
  const stages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"]
  const leadsByStage: Record<string, { count: number; totalValue: number }> = {}
  stages.forEach((s) => (leadsByStage[s] = { count: 0, totalValue: 0 }))
  for (const lead of leads) {
    if (!leadsByStage[lead.stage]) {
      leadsByStage[lead.stage] = { count: 0, totalValue: 0 }
    }
    leadsByStage[lead.stage].count += 1
    leadsByStage[lead.stage].totalValue += lead.value || 0
  }

  // Monthly revenue data for chart
  const monthlyRevenue: { month: string; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const monthRevenue = paidInvoicesLast6Months
      .filter((inv: any) => {
        const issueDate = new Date(inv.issueDate)
        return issueDate.getMonth() === d.getMonth() && issueDate.getFullYear() === d.getFullYear() && inv.status === "PAID"
      })
      .reduce((sum: number, inv: any) => sum + (inv.paidAmount || 0), 0)
    monthlyRevenue.push({ month: key, revenue: monthRevenue })
  }

  // Previous month revenue (for trend)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const prevMonthKey = `${new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth() + 1).padStart(2, "0")}`

  const currentMonthRevenue = monthlyRevenue.find((m) => m.month === currentMonthKey)?.revenue || 0
  const prevMonthRevenue = monthlyRevenue.find((m) => m.month === prevMonthKey)?.revenue || 0

  const revenueTrend =
    prevMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : currentMonthRevenue > 0
        ? 100
        : 0

  // Trend calculations
  const clientsTrend =
    activeClientsBeforeThisMonth > 0
      ? Math.round(((activeClientsCount - activeClientsBeforeThisMonth) / activeClientsBeforeThisMonth) * 100)
      : 0

  const projectsTrend =
    activeProjectsBeforeThisMonth > 0
      ? Math.round(((activeProjectsCount - activeProjectsBeforeThisMonth) / activeProjectsBeforeThisMonth) * 100)
      : 0

  // Dynamic greeting based on time of day
  const hour = now.getHours()
  let greeting = "Good morning"
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon"
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good evening"
  } else if (hour >= 21 || hour < 5) {
    greeting = "Good night"
  }

  // Format current date
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            {greeting}
          </h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/clients/new" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create new
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          value={activeClientsCount}
          label="Active Clients"
          format="number"
          trend={{
            value: clientsTrend,
            label: "vs last month",
          }}
        />
        <KPICard
          icon={<Briefcase className="w-5 h-5 text-indigo-600" />}
          iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
          value={activeProjectsCount}
          label="Active Projects"
          format="number"
          trend={{
            value: projectsTrend,
            label: "vs last month",
          }}
        />
        <KPICard
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          value={outstandingTotal}
          label="Outstanding"
          trend={{
            value: 0,
            label: `${outstandingInvoices.length} invoices`,
          }}
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          value={revenueThisMonth}
          label="Revenue This Month"
          trend={{
            value: revenueTrend,
            label: "vs last month",
          }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Revenue Chart - 8 cols */}
        <div className="lg:col-span-8">
          <RevenueChart data={monthlyRevenue} />
        </div>

        {/* Right Column - 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          <LeadPipeline data={leadsByStage} />
          <OutstandingPayments invoices={allInvoicesForOutstanding as any[]} />
        </div>

        {/* Tasks - Full width on mobile, 8 cols on lg */}
        <div className="lg:col-span-8">
          <TaskList tasks={recentTasks as any[]} />
        </div>

        {/* Activity Feed - 4 cols on lg, sized to content */}
        <div className="lg:col-span-4">
          <ActivityFeed activities={recentActivities as any[]} />
        </div>
      </div>
    </div>
  )
}
