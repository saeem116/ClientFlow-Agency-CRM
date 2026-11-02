import {
  Users,
  Target,
  FolderKanban,
  CheckSquare,
  FileText,
  BarChart3,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Client Management",
    description:
      "Organize client details, communication history, company info, and relationships. Search, filter, and deactivate clients as needed.",
    href: "/clients",
  },
  {
    icon: Target,
    title: "Lead Pipeline",
    description:
      "Track leads through customizable stages. Monitor opportunity values, sources, and follow-up dates. Visual pipeline shows conversion health.",
    href: "/leads",
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    description:
      "Plan projects with milestones, budgets, timelines, and status tracking (Draft/Active/On Hold/Completed). Link clients and track progress.",
    href: "/projects",
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    description:
      "Kanban-style board with Backlog → In Progress → In Review → Done flow. Assign tasks, set priorities and due dates, filter by assignee.",
    href: "/tasks",
  },
  {
    icon: FileText,
    title: "Invoice & Payment Management",
    description:
      "Create professional invoices with line items, tax rates, and auto-calculated totals. Record payments, track outstanding balances, and generate reports.",
    href: "/invoices",
  },
  {
    icon: BarChart3,
    title: "Revenue Analytics",
    description:
      "Dashboard KPIs: active clients, projects, outstanding invoices, monthly revenue. 6-month trend chart, lead pipeline by stage, and task overview.",
    href: "/reports",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 lg:py-24 bg-muted/30 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Key Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Features that agencies actually use
          </h2>
          <p className="text-lg text-muted-foreground">
            Every feature exists because real agencies needed it. No bloat, no fluff — just tools that help you deliver.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">{feature.description}</p>
              <a
                href={feature.href}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Learn more
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">&rarr;</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}