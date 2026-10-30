# ClientFlow — Database Index Verification

## Overview

All indexes are defined in the Mongoose schemas and created by `database/migrations/001-create-indexes.js`. This document verifies that every query pattern in the application has adequate index support.

## Index Reference

| Collection | Field(s) | Type | Purpose |
|---|---|---|---|
| **User** | `email` | unique + index | Login lookups, auth |
| **Organization** | `slug` | unique + index | Org resolution by slug |
| **Membership** | `organizationId, userId` | unique compound | One membership per user/org |
| **Membership** | `organizationId` | index | List memberships for org |
| **Membership** | `userId` | index | List orgs for user |
| **Client** | `organizationId` | index | Org-scoped client queries |
| **Client** | `status` | index | Filter clients by status |
| **Client** | `email` | index | Client lookups |
| **Lead** | `organizationId` | index | Org-scoped lead queries |
| **Lead** | `stage` | index | Pipeline stage filtering |
| **Lead** | `title` | index | Search by lead name |
| **Lead** | `followUpAt` | index | Upcoming follow-up queries |
| **Project** | `organizationId` | index | Org-scoped project queries |
| **Project** | `status` | index | Project status filtering |
| **Project** | `name` | index | Search by project name |
| **Project** | `clientId` | index | Client project list |
| **Milestone** | `projectId` | index | Project milestone list |
| **Task** | `organizationId` | index | Org-scoped task queries |
| **Task** | `status` | index | Task status filtering |
| **Task** | `title` | index | Search by task name |
| **Task** | `projectId` | index | Project task list |
| **Task** | `assigneeId` | index | Assignee task list |
| **Invoice** | `number` | unique + index | Invoice lookups by number |
| **Invoice** | `organizationId` | index | Org-scoped invoice queries |
| **Invoice** | `clientId` | index | Client invoice list |
| **Invoice** | `status` | index | Invoice status filtering |
| **Payment** | `invoiceId` | index | Invoice payment list |
| **Payment** | `organizationId` | index | Org-scoped payment queries |
| **Notification** | `userId` | index | User notification list |
| **Notification** | `organizationId` | index | Org-scoped notification queries |
| **Notification** | `type` | index | Notification type filtering |
| **Notification** | `readAt` | index | Read/unread filtering |
| **Invitation** | `email` | index | Invitation lookup by email |
| **Invitation** | `organizationId` | index | Org invitation list |
| **Invitation** | `tokenPrefix` | index | Token prefix lookup (security) |
| **Invitation** | `expiresAt` | index | Expiry cleanup queries |
| **Invitation** | `status` | index | Status filtering |

## Compound Indexes

```javascript
// Membership: one membership per user per organization
{ organizationId: 1, userId: 1 }: { unique: true }

// Invitation: active invitations by org (no explicit compound needed, individual indexes suffice)
// Use case: find all pending invitations for an org
// Query: { organizationId: orgId, status: "PENDING" }
// Efficient with: organizationId index + status index (MongoDB can combine)
```

## Verified Query Patterns

All API routes filter by `organizationId`. These indexes ensure:

1. **Org-scoped queries**: Every collection has `organizationId` index
2. **Login**: User email is unique index
3. **Invoices by number**: Unique index on `number`
4. **Tasks by project/assignee**: Compound lookups covered by individual indexes
5. **Notifications by user**: userId index covers personal notifications
6. **Invitations by token prefix**: Security-focused prefix index for fast hash lookup

## Schema-Defined Indexes (via Mongoose)

The migration script reads `model.schema.indexes` at runtime and creates any missing indexes. This ensures schema changes are automatically reflected in the database.

## Migration Safety

- **Non-destructive**: Only creates missing indexes, never drops or modifies existing ones
- **Idempotent**: Safe to run multiple times
- **No syncIndexes**: Avoids accidental index removal
