# ClientFlow — Project Context for Claude

## Overview

ClientFlow is an Agency CRM built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and MongoDB Atlas with Mongoose. It manages clients, projects, tasks, invoices, leads, files, and team collaboration for creative agencies.

## Architecture

### Core Patterns

- **Organization-scoped data**: Every model (except User) has an `organizationId` field. All API routes filter queries by the authenticated user's organization.
- **Custom session auth**: Session tokens are HMAC-SHA256 signed using `AUTH_SECRET`. Stored as httpOnly cookies. Never trust client-supplied auth state.
- **Mongoose models**: All schemas in `src/lib/mongoose/`. Barrel-exported from `index.ts`. Models use `mongoose.models.X || model()` pattern to prevent OverwriteModelError.
- **GridFS for files**: File storage uses MongoDB GridFS via the `files` bucket. Content-type and magic-byte validation enforced in `src/lib/gridfs.ts`.
- **Invitation tokens**: Cryptographically secure tokens generated with `crypto.getRandomValues()`. SHA-256 hashed before storage. Plain tokens never stored.

### Key Files

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | Session management, auth helpers, org resolution |
| `src/lib/session-token.ts` | Token encoding/decoding/signing |
| `src/lib/database.ts` | DB connection wrapper, model exports, `toPlain()` helper |
| `src/lib/mongoose/*.ts` | Mongoose schemas and model definitions |
| `src/lib/gridfs.ts` | GridFS file upload/download/delete helpers |
| `middleware.ts` | Edge middleware for `/admin/*` route protection |
| `database/migrations/` | Non-destructive DB migration scripts |
| `scripts/seed-demo.js` | Safe, idempotent demo data seeding |

### API Routes

All routes are in `src/app/api/` and follow the pattern:
1. `await ensureDb()` — connect to MongoDB
2. `await getSession()` / `getOrganization()` — verify auth + org scope
3. Perform operation with org-scoped queries
4. Return JSON response

### Roles

- **ADMIN**: Full access including `/admin/users`, invitation management
- **MEMBER**: Standard CRUD on clients, projects, tasks, invoices, leads
- **CLIENT**: Read-only access (used for external stakeholders)

Admin is currently identified by `ADMIN_EMAIL` env var match. This is a simple but effective approach for the current scale.

## Security Notes

- Session tokens MUST be signed (see `session-token.ts`). Do not revert to unsigned tokens.
- All write operations must pass through `getOrganization()` to enforce tenant isolation.
- Passwords use bcrypt with 12 rounds. No plaintext passwords in source code.
- File uploads validate MIME types AND magic bytes (defense in depth).
- The `AUTH_SECRET` env var is required in production. An unset secret throws an error.

## Testing

```bash
npm run test:unit        # Vitest unit tests
npm run test:integration # Vitest integration tests (requires MongoDB)
npm run test:e2e         # Playwright E2E tests
npm run test:all         # All of the above
```

Tests connect to `TEST_MONGODB_URI` (default: `mongodb://localhost:27017/clientflow-test`). The production `MONGODB_URI` is explicitly unset in `vitest.config.ts` to prevent accidental test execution against production data.

## Building & Deployment

```bash
npm run build   # Next.js production build
npm start       # Start production server
```

Deployment targets:
- **Vercel**: Push to GitHub, import in Vercel, add env vars
- **Docker**: See `Dockerfile` (if present) or build manually
- **VPS**: See `HowToSetup.md` for PM2 + Nginx deployment

## Vibe96 Submission Requirements

This project was audited for Vibe96 software submission. Required artifacts:

- ✅ `README.md` — project description and quick start
- ✅ `HowToSetup.md` — deployment guide (Docker + VPS)
- ✅ `.env.example` — all required environment variables
- ✅ `CLAUDE.md` — this file, project context for AI agents
- ✅ `CHANGELOG.md` — version history starting at 1.0.0
- ✅ `database/migrations/` — MongoDB-compatible initialization
- ✅ Safe demo seed script (`scripts/seed-demo.js`)
- ✅ API documentation in README

## Do NOT

- Run `reset-db.js` or any `dropDatabase()` against production.
- Commit `.env.local`, `.env`, or any files containing real credentials.
- Remove organization scoping from API routes.
- Disable authentication to make tests pass.
- Use `npm audit fix --force` or blindly upgrade dependencies.