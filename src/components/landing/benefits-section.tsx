import { CheckCircle2 } from "lucide-react"

const benefits = [
  {
    title: "Keep every client relationship organized",
    description:
      "Centralize client details, communication history, company info, and notes in one place. No more scattered spreadsheets or lost emails.",
  },
  {
    title: "Track leads from first contact to conversion",
    description:
      "Visual pipeline with stages (New → Contacted → Qualified → Proposal → Won/Lost). Know exactly where every opportunity stands and what needs action.",
  },
  {
    title: "Manage projects, tasks and milestones",
    description:
      "Break projects into milestones and tasks. Kanban board for task flow, due dates, priorities, and assignees. Everyone knows what's next.",
  },
  {
    title: "Create and track invoices and payments",
    description:
      "Professional invoices with line items and tax. Record payments, auto-calculate balances, and see outstanding amounts instantly.",
  },
  {
    title: "Monitor revenue and business performance",
    description:
      "Dashboard with real-time KPIs: active clients, projects, outstanding invoices, monthly revenue trends. Make decisions with data.",
  },
  {
    title: "Keep teams aligned through notifications",
    description:
      "In-app notifications for task assignments, project updates, payments received, and new leads. Never miss what matters.",
  },
]

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Benefits
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Everything your agency needs, without the scattered workflow
          </h2>
          <p className="text-lg text-muted-foreground">
            Stop juggling tools. ClientFlow unifies client management, project tracking, invoicing, and business insights in one workspace.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{benefit.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}