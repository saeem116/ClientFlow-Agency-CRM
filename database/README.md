# Database Migration & Initialization

## Architecture

ClientFlow uses **MongoDB** (no SQL) with **Mongoose** for schema definitions,
validation, and indexes. There is no SQL schema — MongoDB is schemaless, and
Mongoose schemas define the structure at the application layer.

## Files in This Directory

| File | Purpose |
|---|---|
| `migrations/001-create-indexes.js` | Creates all required MongoDB indexes. Idempotent and
non-destructive — safe to run against any database state. |
| `migrations/002-seed-demo-data.js` | Seeds realistic fake demo data. Safe,
idempotent, refuses to run against production URIs. |

## How to Create a Fresh Database

```bash
# 1. Set your MongoDB connection string
export MONGODB_URI="mongodb://localhost:27017/clientflow"
# Or for Atlas:
# export MONGODB_URI="mongodb+srv://user:pass@cluster0.xxx.mongodb.net/clientflow"

# 2. Run the index migration (creates collections implicitly via model registration)
node database/migrations/001-create-indexes.js

# 3. Seed demo data (optional, for local development / review)
node database/migrations/002-seed-demo-data.js
```

## Safety Guarantees

- **Idempotent**: both scripts detect existing data and skip safely.
- **Non-destructive to production**: they never call `dropDatabase()` or delete
  existing records.
- **Refuses production URIs**: seed scripts reject URIs containing `atlas` or
  `cluster` hostnames to prevent accidental writes to production.
- **Demo data only**: seed scripts create fake data with `.test` / `.demo`
  domain emails and passwords generated at runtime (never hardcoded).

## Mongoose Models (Source of Truth)

All schemas are defined in `src/lib/mongoose/*.ts`. Each file contains a
`Schema` definition and a Mongoose model export. Key collections:

- **User** — email, password hash, role, avatar
- **Organization** — name, slug
- **Membership** — user ↔ organization (ADMIN/MEMBER/CLIENT)
- **Client** — company contact details, scoped to organization
- **Lead** — pipeline stages (NEW → WON/LOST), scoped to organization
- **Project** — status, priority, budget, linked to client
- **Milestone** — project phases with due dates and completion tracking
- **Task** — kanban statuses, linked to project/milestone
- **Invoice** — line items, tax, payments
- **Payment** — payment records per invoice
- **Activity** — audit log entries
- **Notification** — in-app notifications
- **Invitation** — secure token-based team invites
- **File** — GridFS metadata (original filename, content-type, size)
