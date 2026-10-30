# Demo Data Seeding Guide

## Overview

This project uses MongoDB with Mongoose. There is no SQL seed file because
MongoDB does not use SQL. Instead, realistic demo data is created via Mongoose
model methods in Node.js scripts.

## Seed Scripts

### Development Seed (`scripts/seed-demo.js`)

Creates minimal demo data (1 org, 1 admin, 1 client, 1 project, 1 task, 1
invoice) for local development testing.

```bash
# Prerequisites: MONGODB_URI set to a local or test database
node scripts/seed-demo.js
```

**Safety**: Refuses to run against production (Atlas/cluster) URIs. Skips if
any user already exists (idempotent).

### Reviewer Seed (`database/migrations/002-seed-demo-data.js`)

Creates a richer dataset with two users (admin + member), multiple clients,
leads, projects, tasks, and an invoice with line items.

```bash
# Prerequisites: MONGODB_URI set to a local or test database
node database/migrations/002-seed-demo-data.js
```

**Safety**: Same production-guard and idempotency guarantees as above.

### Public Demo Seed (`scripts/seed-demo-public.js`)

Creates the shared public reviewer account for Vibe96 submissions. Uses a
**separate demo database** (`clientflow_demo`) to avoid touching production.

```bash
CONFIRM_DEMO_SEED=YES \
DEMO_SEED_MONGODB_URI=mongodb://localhost:27017/clientflow_demo \
DEMO_REVIEWER_PASSWORD="<your-strong-password>"
node scripts/seed-demo-public.js
```

**Safety**: Explicit `CONFIRM_DEMO_SEED=YES` opt-in guard. Parsed and
validated URI must target exactly the `clientflow_demo` database.

## Demo Credentials

| Script | Email | Role |
|---|---|---|
| `seed-demo.js` | `admin@demo.test` | ADMIN |
| `002-seed-demo-data.js` | `admin@demoagency.test` | ADMIN |
| `002-seed-demo-data.js` | `member@demoagency.test` | MEMBER |
| `seed-demo-public.js` | `reviewer@clientflow.test` | MEMBER |

Passwords are **generated at runtime** and printed to the console. They are
never stored in source code.

## Resetting the Database (Development Only)

```bash
# DANGER: drops the entire database. --force flag required.
npm run db:reset -- --force
```

This is restricted to localhost-only URIs. Never run against production.

## Testing Against a Separate Database

Tests use `TEST_MONGODB_URI` (default: `mongodb://localhost:27017/clientflow-test`).
The production `MONGODB_URI` is explicitly unset in `vitest.config.ts` to
prevent accidental test execution against production data.
