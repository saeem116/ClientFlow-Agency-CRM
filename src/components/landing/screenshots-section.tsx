import { Monitor, Maximize2 } from "lucide-react"

const screenshots = [
  {
    id: "dashboard",
    title: "Dashboard Overview",
    description:
      "KPI cards, revenue trend chart, lead pipeline by stage, recent tasks, and activity feed — all in one view.",
    alt: "ClientFlow dashboard with KPI cards and charts",
  },
  {
    id: "clients-leads",
    title: "Clients & Leads",
    description:
      "Searchable client list with status badges, and visual lead pipeline with drag-and-drop stage management.",
    alt: "ClientFlow clients list and lead pipeline view",
  },
  {
    id: "projects-tasks",
    title: "Projects & Tasks",
    description:
      "Project cards with progress indicators, milestone tracking, and Kanban task board with assignees and priorities.",
    alt: "ClientFlow projects view and task Kanban board",
  },
  {
    id: "invoices",
    title: "Invoices & Payments",
    description:
      "Invoice list with status, amounts, due dates, and payment history. Create invoices with line items and tax.",
    alt: "ClientFlow invoices list and payment tracking",
  },
]

export function ScreenshotsSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Product Screenshots
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            The interface you&apos;ll use every day
          </h2>
          <p className="text-lg text-muted-foreground">
            Clean, purposeful design that gets out of your way. Every screen serves a workflow, not a demo.{""}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {screenshots.map((shot, index) => (
            <article
              key={shot.id}
              className="group rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-muted/10 to-accent/5 flex items-center justify-center">
                  <div className="text-center p-6">
                    <Monitor className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">{shot.title}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Real app screenshot</p>
                  </div>
                </div>
                {/* Browser chrome */}
                <div className="absolute top-0 left-0 right-0 h-9 bg-muted/80 backdrop-blur border-b border-border flex items-center px-3 gap-1.5">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-destructive/60" />
                    <span className="w-3 h-3 rounded-full bg-warning/60" />
                    <span className="w-3 h-3 rounded-full bg-success/60" />
                  </div>
                  <span className="ml-3 text-xs text-muted-foreground font-mono">
                    clientflow.app/{shot.id}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-lg font-semibold text-foreground">{shot.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{shot.description}</p>
                <button
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90 transition-colors border border-primary/20"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  View full size
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}