# ClientFlow — AI Agent Instructions (AGENTS.md)

This file provides context for AI agents and contributors working on the
ClientFlow codebase.

## Project Summary

ClientFlow is an agency CRM built with:

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** + shadcn/ui components
- **MongoDB Atlas** via Mongoose 8
- **GridFS** for file storage
- **Custom HMAC-SHA256 session auth** (no OAuth / JWT libraries)

## Key Conventions

### API Routes

Every route in `src/app/api/` must:

1. Call `await ensureDb()` first.
2. Verify auth via `await getSession()` or `await requireOrg()`.
3. Scope all queries by `organizationId` — never trust the client.
4. Return JSON with `{ error: "…" }` on failure; no raw stack traces.

### Mongoose Models

All schemas live in `src/lib/mongoose/*.ts`. Models use the
`mongoose.models.X || model()` pattern to prevent `OverwriteModelError`
during HMR.

### Auth

- Session tokens are signed with `AUTH_SECRET` (HMAC-SHA256).
- `middleware.ts` guards `/admin/*` at the edge.
- Every mutating API route calls `requireOrg()` to enforce tenant isolation.
- The shared demo account (`reviewer@clientflow.test`) is read-only; write
  routes check `requireNotDemoAccount()` and reject with 403.

### File Uploads

Files go to GridFS via `src/lib/gridfs.ts`. MIME type and magic-byte
validation is enforced server-side. Client metadata is stored in the `File`
collection.

### Tests

- Unit/integration tests: `vitest` (MongoDB required via `TEST_MONGODB_URI`).
- E2E tests: `playwright` (requires a running dev server).
- Run all: `npm run test:all`
- Run unit only: `npm run test:unit`

## Architecture Decisions

- **No Prisma** — we use Mongoose schemas directly.
- **No SQL** — MongoDB is schemaless; migration scripts create indexes only.
- **No database reset in CI** — tests run against a dedicated test DB.
- **No production creds in source** — `.env.local` is gitignored.

## Do NOT

- Run `reset-db.js` against any URI other than localhost.
- Commit `.env.local`, `.env`, or real credentials.
- Remove organization scoping from API routes.
- Disable auth in tests to make them pass.
- Use `npm audit fix --force` or blindly upgrade dependencies.

## Common Tasks

### Adding a new Mongoose model

1. Create `src/lib/mongoose/<name>.ts` with schema + model export.
2. Re-export from `src/lib/mongoose/index.ts`.
3. Add the model to `src/lib/database.ts` barrel export.
4. Sync indexes in `database/migrations/001-create-indexes.js`.

### Adding a new API route

1. Create `src/app/api/<resource>/route.ts`.
2. Use `ensureDb()`, `getSession()` / `requireOrg()`.
3. Scope all queries by `organizationId`.
4. Add tests in `src/__tests__/` if applicable.

### Seeding demo data

```bash
# Local dev
node database/migrations/002-seed-demo-data.js

# Public demo
CONFIRM_DEMO_SEED=YES \
DEMO_SEED_MONGODB_URI=mongodb://localhost:27017/clientflow_demo \
DEMO_REVIEWER_PASSWORD="..." \
node scripts/seed-demo-public.js
```

### Creating submission archive

```bash
.\scripts\create-submission-archive.ps1
# or
bash scripts/create-submission-archive.sh
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
