import { Monitor, Smartphone } from "lucide-react";

const screenshots = [
  {
    id: "dashboard",
    title: "Dashboard & Analytics",
    image: "/Dashboard & Analytics.png",
    description:
      "Real-time KPIs, revenue trends, and project health at a glance",
    alt: "ClientFlow dashboard showing KPI cards, revenue chart, lead pipeline, and task list",
  },
  {
    id: "clients",
    title: "Client & Lead Management",
    image: "/Client & Lead Management.png",
    description:
      "Organize contacts, track leads through stages, and never miss a follow-up",
    alt: "ClientFlow client list and lead pipeline view",
  },
  {
    id: "projects",
    title: "Project & Task Management",
    image: "/Project & Task Management.png",
    description:
      "Plan projects, set milestones, assign tasks, and track progress visually",
    alt: "ClientFlow project view with milestones and task board",
  },
  {
    id: "invoices",
    title: "Invoice & Payment Tracking",
    image: "/Invoice & Payment Tracking.png",
    description:
      "Create invoices, record payments, and monitor outstanding balances",
    alt: "ClientFlow invoice list with status badges and payment history",
  },
];

export function ProductPreview() {
  return (
    <section id="preview" className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            See ClientFlow in action
          </h2>
          <p className="text-lg text-muted-foreground">
            Real screenshots from the actual application. No mockups, no
            placeholders — just the real product interface you&apos;ll use every
            day.
          </p>
        </div>

        <div className="space-y-16">
          {screenshots.map((shot, index) => (
            <div
              key={shot.id}
              className={`flex flex-col lg:flex-row gap-12 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Image */}
              <div className="relative w-full lg:w-1/2 order-1 lg:order-none">
                {/* Browser chrome */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-muted/80 backdrop-blur border-b border-border flex items-center px-3 gap-1.5 z-10">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-destructive/60" />
                    <span className="w-3 h-3 rounded-full bg-warning/60" />
                    <span className="w-3 h-3 rounded-full bg-success/60" />
                  </div>
                  <span className="ml-3 text-xs text-muted-foreground font-mono">
                    clientflow.app
                  </span>
                </div>
                <div className="relative aspect-[2.08/1] rounded-2xl overflow-hidden border border-border bg-muted shadow-xl">
                  <img
                    src={shot.image}
                    alt={shot.alt}
                    className="w-full h-full object-contain object-center"
                  />
                </div>
              </div>

              {/* Copy */}
              <div className="lg:w-1/2 order-0 lg:order-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
                  <Monitor className="h-3 w-3" />
                  Product Preview
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                  {shot.title}
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {shot.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-4 w-4" />
                    Responsive
                  </span>
                  <span className="flex items-center gap-1">
                    <Monitor className="h-4 w-4" />
                    Desktop & tablet
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}