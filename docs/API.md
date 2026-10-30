# ClientFlow Agency CRM — API Documentation

**Base URL:** `/api` (relative to deployment domain)  
**Authentication:** Session cookie (`session`) — HMAC-SHA256 signed tokens  
**Organization Scoping:** All write operations are scoped to the authenticated user's organization  
**Content-Type:** `application/json` for requests and responses  

---

## Authentication

All API routes (except `/api/health` and `/api/auth/signin`, `/api/auth/signup`, `/api/auth/accept-invitation`) require a valid session cookie.

### Session Token
- HttpOnly, Secure (production), SameSite=Lax cookie named `session`
- Contains: `userId`, `organizationId`, `context` ("production" | "demo"), `timestamp`
- Signed with `AUTH_SECRET` (HMAC-SHA256)
- Max age: 30 days

### Roles
- **ADMIN**: Full access including `/admin/users`, invitation management
- **MEMBER**: Standard CRUD on clients, projects, tasks, invoices, leads
- **CLIENT**: Read-only (external stakeholders)

Admin is identified by `ADMIN_EMAIL` environment variable match.

### Demo Account
- Email: `reviewer@clientflow.test`
- Role: `MEMBER` (read-only on shared demo data)
- Authenticates against separate `clientflow_demo` database
- Cannot create, update, or delete records

---

## Endpoints

### Health Check

#### `GET /api/health`
No authentication required.

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-10-30T12:00:00.000Z"
}
```

---

### Authentication

#### `POST /api/auth/signin`
Sign in with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": null,
    "role": "MEMBER",
    "organizationRole": "ADMIN",
    "phone": null,
    "organizationId": "507f1f77bcf86cd799439012"
  }
}
```

**Errors:**
- `400`: Missing email/password
- `401`: Invalid credentials
- `500`: Database unavailable, AUTH_SECRET not configured

#### `POST /api/auth/signup`
Register a new user and create their personal organization.

**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "John Doe",
  "password": "securePassword123"
}
```

**Response 201:**
```json
{
  "user": { ... }
}
```

**Errors:**
- `400`: Validation error (email format, password too short)
- `409`: Email already registered
- `403`: Attempting to register reserved demo email

#### `POST /api/auth/signout`
Sign out (clears session cookie).

**Response 200:**
```json
{ "success": true }
```

#### `GET /api/auth/me`
Get current session user.

**Response 200:**
```json
{
  "user": { ... },
  "isDemo": false,
  "context": "production"
}
```

**Response 401:** No valid session

#### `POST /api/auth/password`
Change password (authenticated).

**Request:**
```json
{
  "currentPassword": "oldPass123",
  "newPassword": "newPass456"
}
```

**Response 200:** `{ "success": true }`  
**Errors:** `401` invalid current password, `400` validation

#### `POST /api/auth/profile`
Update profile (name, phone, avatar).

**Request:**
```json
{
  "name": "New Name",
  "phone": "+1 555-0100"
}
```

**Response 200:** Updated user object

#### `POST /api/auth/accept-invitation`
Accept an invitation token (public endpoint).

**Request:**
```json
{
  "token": "abcdef123456...",
  "name": "New User",
  "password": "securePassword123"
}
```

**Response 200:** User session created

---

### Users (Admin Only)

#### `GET /api/admin/users`
List all users in the organization (ADMIN only).

**Response 200:**
```json
{
  "users": [
    {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "MEMBER",
      "organizationRole": "MEMBER",
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ]
}
```

**Errors:** `403` not admin, `401` no session

---

### Invitations

#### `POST /api/invitations`
Create a new invitation (ADMIN only).

**Request:**
```json
{
  "email": "invitee@example.com",
  "role": "MEMBER"
}
```

**Response 201:**
```json
{
  "invitation": {
    "id": "...",
    "email": "invitee@example.com",
    "role": "MEMBER",
    "status": "PENDING",
    "expiresAt": "2026-11-15T10:00:00.000Z",
    "tokenPrefix": "abc123def"
  },
  "invitationUrl": "https://app.example.com/accept-invitation?token=..."
}
```

**Errors:** `403` not admin, `400` invalid email/role

#### `GET /api/invitations`
List invitations for the organization (ADMIN only).

**Response 200:**
```json
{
  "invitations": [ ... ]
}
```

#### `DELETE /api/invitations/[id]`
Revoke an invitation (ADMIN only).

**Response 200:** `{ "success": true }`

---

### Clients

All client endpoints require authentication and organization scoping.

#### `GET /api/clients`
List clients with pagination and filters.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` — search name, email, company
- `status` — `active` | `inactive` | `prospect`
- `sort` — `createdAt` | `name` | `companyName` (default: `createdAt`)
- `order` — `asc` | `desc` (default: `desc`)

**Response 200:**
```json
{
  "clients": [
    {
      "id": "...",
      "firstName": "Alice",
      "lastName": "Johnson",
      "companyName": "TechStart Inc",
      "email": "alice@techstart.demo",
      "phone": "+1 555-0101",
      "website": "https://techstart.demo",
      "address": null,
      "city": null,
      "country": null,
      "notes": null,
      "status": "active",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z",
      "organizationId": "...",
      "createdById": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

#### `POST /api/clients`
Create a new client.

**Request:**
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "companyName": "TechStart Inc",
  "email": "alice@techstart.demo",
  "phone": "+1 555-0101",
  "website": "https://techstart.demo",
  "address": "123 Main St",
  "city": "San Francisco",
  "country": "USA",
  "notes": "Key decision maker",
  "status": "active"
}
```

**Required:** At least one of `firstName`, `lastName`, `companyName`, `email`  
**Response 201:** Created client object  
**Errors:** `400` validation, `401` no auth, `403` demo read-only

#### `GET /api/clients/[id]`
Get a single client by ID.

**Response 200:** Client object  
**Errors:** `404` not found, `403` cross-org access

#### `PATCH /api/clients/[id]`
Update a client.

**Request:** Partial client fields  
**Response 200:** Updated client  
**Errors:** `400` validation, `403` demo read-only / cross-org, `404` not found

#### `DELETE /api/clients/[id]`
Delete a client (soft delete — sets status to `inactive`).

**Response 200:** `{ "success": true }`  
**Errors:** `403` demo read-only / cross-org, `404` not found

---

### Leads

All lead endpoints require authentication and organization scoping.

#### `GET /api/leads`
List leads with pagination and filters.

**Query Parameters:**
- `page`, `limit`, `sort`, `order` (same as clients)
- `search` — search title, email, description
- `stage` — `NEW` | `CONTACTED` | `QUALIFIED` | `PROPOSAL_SENT` | `WON` | `LOST`
- `source` — `WEBSITE` | `REFERRAL` | `SOCIAL_MEDIA` | `EMAIL` | `PHONE` | `OTHER`

**Response 200:**
```json
{
  "leads": [
    {
      "id": "...",
      "title": "E-commerce platform redesign",
      "description": "Full stack rebuild for retail giant",
      "email": "contact@retailgiant.demo",
      "phone": null,
      "stage": "NEW",
      "source": "WEBSITE",
      "value": 50000,
      "notes": null,
      "followUpAt": null,
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z",
      "organizationId": "...",
      "clientId": null,
      "createdById": "..."
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/leads`
Create a new lead.

**Request:**
```json
{
  "title": "New Project Inquiry",
  "description": "Client needs a website",
  "email": "client@example.com",
  "phone": "+1 555-0100",
  "stage": "NEW",
  "source": "WEBSITE",
  "value": 25000,
  "notes": "Initial contact",
  "followUpAt": "2026-02-01T00:00:00.000Z",
  "clientId": "optional-client-id"
}
```

**Required:** `title`  
**Response 201:** Created lead object  
**Errors:** `400` validation (invalid stage/source), `403` demo read-only

#### `GET /api/leads/[id]`
Get a single lead.

#### `PATCH /api/leads/[id]`
Update a lead (including stage transitions).

#### `DELETE /api/leads/[id]`
Delete a lead.

---

### Projects

All project endpoints require authentication and organization scoping.

#### `GET /api/projects`
List projects with pagination and filters.

**Query Parameters:**
- `page`, `limit`, `sort`, `order`
- `search` — search name, description
- `status` — `DRAFT` | `ACTIVE` | `ON_HOLD` | `COMPLETED` | `CANCELLED`
- `clientId` — filter by client

**Response 200:**
```json
{
  "projects": [
    {
      "id": "...",
      "name": "TechStart Website Redesign",
      "description": "Complete brand refresh and new website",
      "status": "ACTIVE",
      "priority": "HIGH",
      "budget": 15000,
      "startDate": "2026-01-15T00:00:00.000Z",
      "endDate": "2026-04-15T00:00:00.000Z",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z",
      "organizationId": "...",
      "clientId": "...",
      "createdById": "...",
      "client": { "id": "...", "firstName": "Alice", "lastName": "Johnson", "companyName": "TechStart Inc" }
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/projects`
Create a new project.

**Request:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "status": "DRAFT",
  "priority": "MEDIUM",
  "budget": 10000,
  "startDate": "2026-02-01T00:00:00.000Z",
  "endDate": "2026-05-01T00:00:00.000Z",
  "clientId": "client-object-id"
}
```

**Required:** `name`, `clientId`  
**Response 201:** Created project  
**Errors:** `400` validation, `403` demo read-only, `404` client not found

#### `GET /api/projects/[id]`
Get a single project with client populated.

#### `PATCH /api/projects/[id]`
Update a project.

#### `DELETE /api/projects/[id]`
Delete a project.

---

### Tasks

All task endpoints require authentication and organization scoping.

#### `GET /api/tasks`
List tasks with pagination and filters.

**Query Parameters:**
- `page`, `limit`, `sort`, `order`
- `search` — search title, description
- `status` — `BACKLOG` | `IN_PROGRESS` | `IN_REVIEW` | `DONE`
- `priority` — `LOW` | `MEDIUM` | `HIGH` | `URGENT`
- `projectId` — filter by project
- `assigneeId` — filter by assignee
- `overdue` — `true` | `false` (tasks past dueDate with status != DONE)

**Response 200:**
```json
{
  "tasks": [
    {
      "id": "...",
      "title": "Design homepage mockup",
      "description": "Create Figma prototype",
      "status": "DONE",
      "priority": "HIGH",
      "dueDate": "2026-01-20T00:00:00.000Z",
      "completedAt": "2026-01-18T14:30:00.000Z",
      "createdAt": "2026-01-10T10:00:00.000Z",
      "updatedAt": "2026-01-18T14:30:00.000Z",
      "projectId": "...",
      "milestoneId": null,
      "assigneeId": "...",
      "organizationId": "...",
      "project": { "id": "...", "name": "TechStart Website Redesign" },
      "assignee": { "id": "...", "name": "Demo Reviewer", "email": "reviewer@clientflow.test" }
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/tasks`
Create a new task.

**Request:**
```json
{
  "title": "New Task",
  "description": "Task description",
  "status": "BACKLOG",
  "priority": "MEDIUM",
  "dueDate": "2026-02-15T00:00:00.000Z",
  "projectId": "project-id",
  "milestoneId": "milestone-id",
  "assigneeId": "user-id"
}
```

**Required:** `title`  
**Response 201:** Created task  
**Errors:** `400` validation, `403` demo read-only, `404` project/milestone/assignee not found

#### `GET /api/tasks/[id]`
Get a single task.

#### `PATCH /api/tasks/[id]`
Update a task (including status transitions).

**Note:** Setting status to `DONE` automatically sets `completedAt` to now.  
Setting status from `DONE` to another value clears `completedAt`.

#### `DELETE /api/tasks/[id]`
Delete a task.

---

### Milestones

All milestone endpoints require authentication and organization scoping (via project).

#### `GET /api/milestones`
List milestones (typically filtered by project).

**Query Parameters:**
- `projectId` (required for meaningful results)
- `page`, `limit`, `sort`, `order`

**Response 200:** Array of milestones with project populated.

#### `POST /api/milestones`
Create a new milestone.

**Request:**
```json
{
  "title": "Phase 1 Complete",
  "description": "Core features delivered",
  "dueDate": "2026-03-01T00:00:00.000Z",
  "projectId": "project-id"
}
```

**Required:** `title`, `projectId`  
**Response 201:** Created milestone

#### `GET /api/milestones/[id]`
Get a single milestone.

#### `PATCH /api/milestones/[id]`
Update a milestone (including `completedAt` to mark complete).

#### `DELETE /api/milestones/[id]`
Delete a milestone.

---

### Invoices

All invoice endpoints require authentication and organization scoping.

#### `GET /api/invoices`
List invoices with pagination and filters.

**Query Parameters:**
- `page`, `limit`, `sort`, `order`
- `search` — search number, client name
- `status` — `DRAFT` | `SENT` | `PARTIALLY_PAID` | `PAID` | `OVERDUE` | `VOIDED`
- `clientId` — filter by client
- `fromDate`, `toDate` — filter by issueDate

**Response 200:**
```json
{
  "invoices": [
    {
      "id": "...",
      "number": "INV-2026-0001",
      "status": "PAID",
      "issueDate": "2026-06-01T00:00:00.000Z",
      "dueDate": "2026-07-01T00:00:00.000Z",
      "notes": "Website redesign - milestone 1",
      "subtotal": 12000,
      "taxRate": 10,
      "taxAmount": 1200,
      "total": 13200,
      "paidAmount": 13200,
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-15T10:00:00.000Z",
      "organizationId": "...",
      "clientId": "...",
      "client": { "id": "...", "firstName": "Alice", "lastName": "Johnson", "companyName": "TechStart Inc" },
      "lineItems": [
        { "id": "...", "description": "UI/UX Design", "quantity": 1, "unitPrice": 8000, "amount": 8000 },
        { "id": "...", "description": "Frontend Development", "quantity": 40, "unitPrice": 100, "amount": 4000 }
      ],
      "payments": [
        { "id": "...", "amount": 13200, "date": "2026-06-15T00:00:00.000Z", "method": "BANK_TRANSFER", "reference": "WIRE-001" }
      ]
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/invoices`
Create a new invoice.

**Request:**
```json
{
  "clientId": "client-id",
  "status": "DRAFT",
  "issueDate": "2026-02-01T00:00:00.000Z",
  "dueDate": "2026-03-01T00:00:00.000Z",
  "notes": "Project deposit",
  "subtotal": 10000,
  "taxRate": 10,
  "lineItems": [
    { "description": "Design", "quantity": 1, "unitPrice": 5000 },
    { "description": "Development", "quantity": 50, "unitPrice": 100 }
  ]
}
```

**Required:** `clientId`, `subtotal`  
**Auto-calculated:** `taxAmount`, `total` (server-side)  
**Response 201:** Created invoice with line items  
**Errors:** `400` validation, `403` demo read-only, `404` client not found

#### `GET /api/invoices/[id]`
Get a single invoice with line items and payments.

#### `PATCH /api/invoices/[id]`
Update an invoice (status, dates, notes, line items).

**Note:** Line items can be updated via nested operations.  
Changing line items recalculates `subtotal`, `taxAmount`, `total`.

#### `POST /api/invoices/[id]/payment`
Record a payment on an invoice.

**Request:**
```json
{
  "amount": 5000,
  "date": "2026-02-15T00:00:00.000Z",
  "method": "BANK_TRANSFER",
  "reference": "WIRE-002",
  "notes": "Partial payment"
}
```

**Required:** `amount`, `date`, `method`  
**Response 201:** Created payment; invoice `paidAmount` and `status` updated  
**Errors:** `400` amount exceeds balance, `403` demo read-only, `404` invoice not found

#### `POST /api/invoices/[id]/update`
Update invoice status (e.g., mark as SENT, VOID).

**Request:**
```json
{
  "status": "SENT"
}
```

**Response 200:** Updated invoice

#### `DELETE /api/invoices/[id]`
Delete an invoice (only if `DRAFT` status).

---

### Payments

Payments are primarily managed via invoice payment endpoint above.

#### `GET /api/invoices/[id]/payments`
List payments for an invoice (included in invoice detail).

---

### Files (GridFS)

File uploads use MongoDB GridFS with content-type and magic-byte validation.

#### `POST /api/files`
Upload a file (multipart/form-data).

**Request:** FormData with `file` field, optional `categoryId`, `clientId`, `projectId`

**Response 201:**
```json
{
  "file": {
    "id": "...",
    "fileId": "gridfs-file-id",
    "originalFilename": "proposal.pdf",
    "contentType": "application/pdf",
    "size": 1024000,
    "uploaderId": "...",
    "organizationId": "...",
    "categoryId": null,
    "clientId": "...",
    "projectId": "...",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
}
```

**Validation:**
- Max size: 25 MB
- Allowed MIME types: PDF, images (PNG, JPEG, GIF, WebP), Office docs (DOCX, XLSX, PPTX), text (TXT, MD, CSV)
- Magic byte validation for all types

#### `GET /api/files`
List files with pagination and filters.

**Query Parameters:**
- `page`, `limit`, `sort`, `order`
- `categoryId`, `clientId`, `projectId`

#### `GET /api/files/[fileId]`
Download a file (streams from GridFS).

**Response:** File binary with appropriate Content-Type and Content-Disposition headers.

#### `DELETE /api/files/[fileId]`
Delete a file from GridFS and metadata.

---

### Notifications

#### `GET /api/notifications`
List notifications for current user.

**Query Parameters:**
- `page`, `limit`
- `read` — `true` | `false` | `all` (default: `all`)

**Response 200:**
```json
{
  "notifications": [
    {
      "id": "...",
      "type": "invoice_paid",
      "title": "Invoice paid",
      "message": "INV-2026-0001 has been paid in full",
      "readAt": null,
      "link": "/invoices",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "organizationId": "..."
    }
  ],
  "pagination": { ... }
}
```

#### `GET /api/notifications/unread-count`
Get count of unread notifications.

**Response 200:**
```json
{ "count": 3 }
```

#### `PATCH /api/notifications/[id]`
Mark notification as read/unread.

**Request:**
```json
{ "read": true }
```

**Response 200:** Updated notification

---

### Search

#### `GET /api/search`
Global search across clients, leads, projects, tasks, invoices.

**Query Parameters:**
- `q` (required) — search query
- `types` — comma-separated: `clients,leads,projects,tasks,invoices` (default: all)
- `limit` — per-type limit (default: 10)

**Response 200:**
```json
{
  "results": {
    "clients": [ ... ],
    "leads": [ ... ],
    "projects": [ ... ],
    "tasks": [ ... ],
    "invoices": [ ... ]
  }
}
```

---

### Avatars

#### `GET /api/avatars/[userId]`
Get user avatar (serves from GridFS or generates initials placeholder).

**Response:** Image binary (PNG) or 404.

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... } // optional, validation errors etc.
}
```

### Common HTTP Status Codes
- `200` — Success
- `201` — Created
- `400` — Bad Request (validation)
- `401` — Unauthorized (no/invalid session)
- `403` — Forbidden (demo read-only, cross-org, insufficient role)
- `404` — Not Found
- `409` — Conflict (duplicate unique field)
- `500` — Server Error (database unavailable, misconfiguration)

### Common Error Codes
- `AUTH_REQUIRED` — No valid session
- `DEMO_READ_ONLY` — Demo account cannot mutate data
- `CROSS_ORG_ACCESS` — Attempted access to another organization's data
- `INVALID_ID` — Malformed ObjectId
- `VALIDATION_ERROR` — Request body failed schema validation
- `NOT_FOUND` — Resource not found
- `DUPLICATE_KEY` — Unique constraint violation
- `INSUFFICIENT_PERMISSIONS` — Role doesn't allow operation
- `DB_UNAVAILABLE` — Database connection failed
- `AUTH_SECRET_MISSING` — AUTH_SECRET not configured

---

## Demo Account Restrictions

The shared demo account (`reviewer@clientflow.test`) has **read-only** access:

| Operation | Allowed? |
|-----------|----------|
| GET (list/detail) | ✅ Yes |
| POST (create) | ❌ No — returns `403 DEMO_READ_ONLY` |
| PATCH (update) | ❌ No — returns `403 DEMO_READ_ONLY` |
| DELETE | ❌ No — returns `403 DEMO_READ_ONLY` |
| File upload | ❌ No |
| Payment recording | ❌ No |

This protects the shared demo data from corruption.

---

## Organization Scoping (Tenant Isolation)

Every model (except User) has an `organizationId` field. All API routes:

1. Resolve the authenticated user's active organization via session
2. Filter all queries by `organizationId`
3. Validate that any referenced IDs (clientId, projectId, etc.) belong to the same organization
4. Reject cross-organization access with `403 CROSS_ORG_ACCESS`

This is enforced at the API layer — no client-supplied organizationId is trusted.

---

## Rate Limiting

Not currently implemented at the API layer. Recommended for production:
- Add middleware for per-IP / per-user rate limiting
- Stricter limits on auth endpoints (signin, signup)

---

## Versioning

API versioning is not yet implemented. All routes are at `/api/*`.  
Future versions may use `/api/v1/*`, `/api/v2/*` with header-based negotiation.

---

## Example: Complete Invoice Workflow

```bash
# 1. Create client
curl -X POST /api/clients \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"firstName":"Alice","lastName":"Johnson","companyName":"TechStart","email":"alice@techstart.com","status":"active"}'

# 2. Create project for client
curl -X POST /api/projects \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"name":"Website Redesign","clientId":"CLIENT_ID","status":"ACTIVE","priority":"HIGH","budget":15000}'

# 3. Create invoice for client
curl -X POST /api/invoices \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"clientId":"CLIENT_ID","subtotal":12000,"taxRate":10,"lineItems":[{"description":"Design","quantity":1,"unitPrice":8000},{"description":"Development","quantity":40,"unitPrice":100}]}'

# 4. Send invoice (update status)
curl -X POST /api/invoices/INVOICE_ID/update \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"status":"SENT"}'

# 5. Record payment
curl -X POST /api/invoices/INVOICE_ID/payment \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"amount":13200,"date":"2026-02-15","method":"BANK_TRANSFER","reference":"WIRE-001"}'
```

---

*Generated from actual route implementations in `src/app/api/` — only documented endpoints exist.*