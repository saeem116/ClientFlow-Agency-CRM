import { Shield, Lock, Users, Database, Activity } from "lucide-react";

const securityFeatures = [
  {
    icon: Shield,
    title: "Organization-scoped data access",
    description:
      "Every record (clients, projects, invoices, etc.) belongs to an organization. Users only see data from their own organization — enforced at the database query level.",
  },
  {
    icon: Lock,
    title: "Role-based permissions",
    description:
      "Three roles: Admin (full access + user management), Member (standard CRUD), Client (read-only). Workspace roles are independent of account-level roles.",
  },
  {
    icon: Database,
    title: "Authenticated sessions",
    description:
      "Session tokens are HMAC-SHA256 signed with a deployment-specific secret. Tokens embed organization context and cannot be forged or tampered with.",
  },
  {
    icon: Users,
    title: "Client and project organization",
    description:
      "Clients and leads are linked to your organization. Projects belong to clients. Tasks link to projects and milestones. Clean relational structure.",
  },
  {
    icon: Shield,
    title: "Controlled demo access",
    description:
      "Public demo account (reviewer@clientflow.test) is read-only by design. Cannot create, update, or delete any records. Isolated demo database.",
  },
  {
    icon: Activity,
    title: "Team collaboration",
    description:
      "Invite team members via email with secure tokens. Notifications for task assignments, project updates, and payments keep everyone in sync.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Security & Collaboration
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Built-in security, not bolted on
          </h2>
          <p className="text-lg text-muted-foreground">
            Data isolation, signed sessions, and role-based access are
            foundational — not afterthoughts.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 p-6 lg:p-10 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
              Demo account is safely isolated
            </h3>
            <p className="text-muted-foreground mb-6">
              The public demo account uses a completely separate database (
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-sm">
                clientflow_demo
              </code>
              ). It can never access production data, and its read-only
              restriction is enforced at every API route — not just the UI.
            </p>
            <p className="text-xs text-muted-foreground/70">
              No certifications claimed (SOC 2, ISO 27001, GDPR). This is honest
              engineering, not compliance theater.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
