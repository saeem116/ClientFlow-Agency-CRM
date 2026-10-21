# Changelog

All notable changes to ClientFlow are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-21

### Added
- Full agency CRM: clients, projects, tasks, invoices, leads, files, notifications.
- Multi-organization (tenant) support with membership-based access control.
- Invitation-based team onboarding with secure token hashes.
- File storage via MongoDB GridFS with content-type and magic-byte validation.
- Avatar upload/delete per user.
- Activity feed and unread notification counts.
- Global search across all entities scoped to the authenticated organization.
- Dark/light theme toggle via NextThemes-compatible provider.
- Password-based authentication with bcrypt hashing (12 rounds).
- Session tokens signed with HMAC-SHA256 using `AUTH_SECRET`.
- HTTP-only, SameSite=lax session cookies with 7-day lifetime.
- Zod-style input validation on profile update and invitation endpoints.
- Mongoose model indexes on `organizationId`, `email`, `status`, `stage`, and other hot paths.
- Edge middleware protecting `/admin/*` routes.
- Non-destructive test database with `example.com` domain isolation.
- Comprehensive unit and integration tests under `src/__tests__/`.
- Vibe96 submission documentation: README, HowToSetup, CHANGELOG, AGENTS.md.

### Changed
- Session tokens are now HMAC-signed (was unsigned base64).
- Task API routes scope queries by `organizationId` to prevent cross-org data leakage.
- Search endpoint scopes tasks by organization.
- Invoice number generation is now scoped to the requesting organization.
- Removed deprecated `@types/mongoose` from devDependencies.
- Seed scripts generate passwords at runtime instead of using hardcoded hashes.
- `reset-db.js` refuses to run against production (Atlas) URIs and requires `--force`.

### Security
- **Breaking**: all existing session cookies must be refreshed after this release.
- All data-changing API routes require a valid session cookie.
- Organization scoping is enforced server-side on every read/write route.
- File uploads validate content type and image magic bytes before storage.
- Invitation tokens are SHA-256 hashed; plain tokens are never stored in the database.
- Constant-time comparison used for signature and invitation token verification.

### Removed
- Hardcoded bcrypt password hash from `seed-data.ts`.
- Prisma-related artifacts from the dependency tree.
