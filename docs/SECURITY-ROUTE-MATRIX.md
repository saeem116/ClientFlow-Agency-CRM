# ClientFlow Security Route Matrix

This document enumerates all API routes in ClientFlow and their authorization requirements. It serves as the authoritative reference for the regression test suite in `src/__tests__/auth/route-authorization-regression.test.ts`.

## Legend

| Symbol | Meaning |
|--------|---------|
| 🔒 | Requires authentication (401 if missing) |
| 🏢 | Requires organization scope (404 for cross-org) |
| 👑 | Admin-only (platform admin email via `ADMIN_EMAIL`) |
| 🚫 | Demo account blocked (403 on write) |
| 👤 | CLIENT role blocked (403 on write) |
| 🔍 | Search injection protected (regex escaped) |
| 🌐 | Public (no auth required) |

## Route Table

| Method | Route | Auth | Org Scope | Admin | Demo Write | Client Write | Search Safe |
|--------|-------|------|-----------|-------|------------|--------------|-------------|
| **Auth** |
| POST | `/api/auth/signin` | 🌐 | — | — | — | — | — |
| POST | `/api/auth/signup` | 🌐 | — | — | — | — | — |
| POST | `/api/auth/signout` | 🌐 | — | — | — | — | — |
| GET | `/api/auth/me` | 🔒 | 🏢 | — | — | — | — |
| PATCH | `/api/auth/profile` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/auth/password` | 🔒 | 🏢 | — | 🚫* | 👤* | — |
| POST | `/api/auth/accept-invitation` | 🌐 | — | — | — | — | — |

*Demo/CLIENT password changes have special handling

| **Admin** |
| GET | `/api/admin/users` | 🔒 | — | 👑 | 🚫 | 👤 | — |

| **Invitations** |
| GET | `/api/invitations` | 🔒 | 🏢 | 👑 | 🚫 | 👤 | — |
| POST | `/api/invitations` | 🔒 | 🏢 | 👑 | 🚫 | 👤 | — |

| **Clients** |
| GET | `/api/clients` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| POST | `/api/clients` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| GET | `/api/clients/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/clients/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| DELETE | `/api/clients/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |

| **Leads** |
| GET | `/api/leads` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| POST | `/api/leads` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| GET | `/api/leads/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/leads/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| DELETE | `/api/leads/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |

| **Projects** |
| GET | `/api/projects` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| POST | `/api/projects` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| GET | `/api/projects/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/projects/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| DELETE | `/api/projects/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |

| **Tasks** |
| GET | `/api/tasks` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| POST | `/api/tasks` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| GET | `/api/tasks/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/tasks/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/tasks/[id]/update` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| DELETE | `/api/tasks/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |

| **Milestones** |
| GET | `/api/milestones` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| POST | `/api/milestones` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| GET | `/api/milestones/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/milestones/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| DELETE | `/api/milestones/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |

| **Invoices** |
| GET | `/api/invoices/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| POST | `/api/invoices` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/invoices/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/invoices/[id]/update` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| POST | `/api/invoices/[id]/payment` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| DELETE | `/api/invoices/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |

| **Files** |
| GET | `/api/files` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| POST | `/api/files` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| GET | `/api/files/[fileId]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/files/[fileId]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| DELETE | `/api/files` | 🔒 | 🏢 | — | 🚫 | 👤 | — |

| **Avatars** |
| GET | `/api/avatars/[userId]` | 🔒 | 🏢 | — | — | — | — |
| POST | `/api/files/avatar` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| DELETE | `/api/files/avatar` | 🔒 | 🏢 | — | 🚫 | 👤 | — |

| **Notifications** |
| GET | `/api/notifications` | 🔒 | 🏢 | — | — | — | — |
| POST | `/api/notifications` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| PATCH | `/api/notifications/[id]` | 🔒 | 🏢 | — | 🚫 | 👤 | — |
| GET | `/api/notifications/unread-count` | 🔒 | 🏢 | — | — | — | — |

| **Search** |
| GET | `/api/search` | 🔒 | 🏢 | — | — | — | 🔍 |

| **Health** |
| GET | `/api/health` | 🌐 | — | — | — | — | — |

## Regression Test Coverage

The test file `src/__tests__/auth/route-authorization-regression.test.ts` verifies:

1. **No auth → 401** — All 🔒 routes return 401 without a session cookie
2. **Malformed token → 401** — All 🔒 routes reject tampered/invalid tokens with 401
3. **Cross-org → 404/403** — All 🏢 routes return 404 (or 403) when accessing another org's resource
4. **Demo write → 403** — All mutating routes return 403 for the shared demo account
5. **CLIENT write → 403** — All mutating routes return 403 for CLIENT role users
6. **Admin routes → 403** — Admin routes return 403 for non-platform-admin users
7. **Search injection → 200 safe** — Search endpoint escapes regex metacharacters

## Implementation Notes

### Organization Scoping
All 🏢 routes use `getOrganization()` (via `requireOrg()`) which:
- Verifies the session cookie
- Returns the authenticated user's organization
- Enforces that every query includes `organizationId: org.id`

### Demo Account Protection
The shared demo account (`reviewer@clientflow.test`) is identified via `getDemoAccountEmail()` in `src/lib/demo-account.ts`. The `requireOrg()` function in `src/lib/auth.ts` calls `requireNotDemoAccount()` which throws for demo sessions on write operations.

### CLIENT Role Protection
User's workspace role is stored in `session.user.organizationRole` (resolved from Membership). Write routes check this role and return 403 for `CLIENT`.

### Admin Authorization
Platform admin access is determined by `isAdminEmail(email)` in `src/lib/auth.ts`, which compares the session user's email against the `ADMIN_EMAIL` environment variable. This is an email-based check, not a database role.

### Search Injection Protection
The `/api/search` endpoint and `/api/admin/users` search now escape regex metacharacters using:
```typescript
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
```

## Middleware Protection

The Edge Runtime middleware (`middleware.ts`) protects all `/admin/*` routes by:
1. Reading the session cookie
2. Verifying the HMAC-SHA256 signature
3. Redirecting to `/sign-in` if invalid or missing

The middleware does NOT perform the admin email check (requires DB lookup) — that happens in the page/API route itself.