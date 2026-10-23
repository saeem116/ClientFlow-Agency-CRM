-- =============================================================================
-- ClientFlow Agency CRM — Schema (SQL Reference)
-- =============================================================================
-- This file documents the logical schema used by ClientFlow.
-- The application uses MongoDB with Mongoose schemas (see src/lib/mongoose/).
-- This SQL is provided as a reference mapping for auditors.
--
-- To initialize the actual database, run:
--   MONGODB_URI=mongodb://localhost:27017/clientflow node database/migrations/001-create-indexes.js
-- =============================================================================

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────────────
CREATE TABLE organizations (
    id          VARCHAR(24) PRIMARY KEY,   -- Mongoose ObjectId string
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          VARCHAR(24) PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255),
    password    VARCHAR(255) NOT NULL,     -- bcrypt hash
    role        VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'CLIENT')),
    createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── MEMBERSHIPS ─────────────────────────────────────────────────────────────
CREATE TABLE memberships (
    id              VARCHAR(24) PRIMARY KEY,
    userId          VARCHAR(24) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'CLIENT')),
    invitedById     VARCHAR(24),
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (userId, organizationId)
);

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE clients (
    id              VARCHAR(24) PRIMARY KEY,
    firstName       VARCHAR(100) NOT NULL,
    lastName        VARCHAR(100),
    companyName     VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    createdById     VARCHAR(24) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── LEADS ───────────────────────────────────────────────────────────────────
CREATE TABLE leads (
    id              VARCHAR(24) PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    company         VARCHAR(255),
    stage           VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (stage IN ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST')),
    source            VARCHAR(50),
    value           DECIMAL(12, 2),
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    createdById     VARCHAR(24) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    assignedToId    VARCHAR(24) REFERENCES users(id),
    clientId        VARCHAR(24) REFERENCES clients(id),
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── PROJECTS ────────────────────────────────────────────────────────────────
CREATE TABLE projects (
    id              VARCHAR(24) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
    priority        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    budget          DECIMAL(12, 2),
    startDate       DATE,
    endDate         DATE,
    clientId        VARCHAR(24) REFERENCES clients(id),
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    createdById     VARCHAR(24) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── MILESTONES ──────────────────────────────────────────────────────────────
CREATE TABLE milestones (
    id              VARCHAR(24) PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    dueDate         DATE,
    completedAt     DATETIME,
    projectId       VARCHAR(24) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── TASKS ───────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
    id              VARCHAR(24) PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'BACKLOG' CHECK (status IN ('BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE')),
    priority        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    dueDate         DATE,
    completedAt     DATETIME,
    projectId       VARCHAR(24) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestoneId     VARCHAR(24) REFERENCES milestones(id) ON DELETE SET NULL,
    assigneeId      VARCHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    createdById     VARCHAR(24) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
    id              VARCHAR(24) PRIMARY KEY,
    number          VARCHAR(50) UNIQUE NOT NULL,
    clientId        VARCHAR(24) NOT NULL REFERENCES clients(id),
    projectId       VARCHAR(24) REFERENCES projects(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')),
    issueDate       DATE,
    dueDate         DATE,
    subtotal        DECIMAL(12, 2) NOT NULL DEFAULT 0,
    taxRate         DECIMAL(5, 2) NOT NULL DEFAULT 0,
    taxAmount       DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total           DECIMAL(12, 2) NOT NULL DEFAULT 0,
    paidAmount      DECIMAL(12, 2) NOT NULL DEFAULT 0,
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    createdById     VARCHAR(24) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── INVOICE LINE ITEMS ──────────────────────────────────────────────────────
CREATE TABLE invoice_line_items (
    id              VARCHAR(24) PRIMARY KEY,
    description     TEXT,
    quantity        DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unitPrice       DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount          DECIMAL(12, 2) NOT NULL DEFAULT 0,
    invoiceId       VARCHAR(24) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE payments (
    id              VARCHAR(24) PRIMARY KEY,
    invoiceId       VARCHAR(24) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount          DECIMAL(12, 2) NOT NULL,
    method          VARCHAR(50) NOT NULL CHECK (method IN ('BANK_TRANSFER', 'CREDIT_CARD', 'PAYPAL', 'STRIPE', 'CASH', 'CHECK')),
    transactionId   VARCHAR(255),
    paidAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── ACTIVITIES ──────────────────────────────────────────────────────────────
CREATE TABLE activities (
    id              VARCHAR(24) PRIMARY KEY,
    type            VARCHAR(50) NOT NULL,
    description     TEXT,
    entityId        VARCHAR(24),
    entityType      VARCHAR(50),
    userId          VARCHAR(24) NOT NULL REFERENCES users(id),
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id              VARCHAR(24) PRIMARY KEY,
    userId          VARCHAR(24) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    link            VARCHAR(500),
    readAt          DATETIME,
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── INVITATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE invitations (
    id              VARCHAR(24) PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    tokenHash       VARCHAR(64) NOT NULL,         -- SHA-256 of invitation token
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'ADMIN')),
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invitedById     VARCHAR(24) NOT NULL REFERENCES users(id),
    expiresAt       DATETIME NOT NULL,
    usedAt          DATETIME,
    createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── FILES (metadata; content stored in GridFS) ───────────────────────────────
CREATE TABLE files (
    id              VARCHAR(24) PRIMARY KEY,
    userId          VARCHAR(24) NOT NULL REFERENCES users(id),
    filename        VARCHAR(255) NOT NULL,
    originalName    VARCHAR(255) NOT NULL,
    mimeType        VARCHAR(100),
    size            BIGINT,
    metadata        JSON,
    organizationId  VARCHAR(24) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploadedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── INDEXES (equivalent to Mongoose schema.index() calls) ──────────────────
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_memberships_user ON memberships(userId);
CREATE INDEX idx_memberships_org ON memberships(organizationId);
CREATE INDEX idx_clients_org ON clients(organizationId);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_leads_org ON leads(organizationId);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_projects_org ON projects(organizationId);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client ON projects(clientId);
CREATE INDEX idx_milestones_project ON milestones(projectId);
CREATE INDEX idx_tasks_project ON tasks(projectId);
CREATE INDEX idx_tasks_milestone ON tasks(milestoneId);
CREATE INDEX idx_tasks_assignee ON tasks(assigneeId);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_org ON tasks(organizationId);
CREATE INDEX idx_invoices_org ON invoices(organizationId);
CREATE INDEX idx_invoices_client ON invoices(clientId);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_lines_invoice ON invoice_line_items(invoiceId);
CREATE INDEX idx_payments_invoice ON payments(invoiceId);
CREATE INDEX idx_activities_org ON activities(organizationId);
CREATE INDEX idx_notifications_user ON notifications(userId);
CREATE INDEX idx_notifications_read ON notifications(userId, readAt);
CREATE INDEX idx_invitations_token ON invitations(tokenHash);
CREATE INDEX idx_invitations_email ON invitations(email, organizationId);
CREATE INDEX idx_files_user ON files(userId);
CREATE INDEX idx_files_org ON files(organizationId);

-- =============================================================================
-- MONGODB ALTERNATIVE
-- =============================================================================
-- This project uses MongoDB with Mongoose 8. The equivalent MongoDB initialization
-- is performed by running:
--   MONGODB_URI=mongodb://localhost:27017/clientflow node database/migrations/001-create-indexes.js
--
-- Mongoose schemas are defined in src/lib/mongoose/*.ts and include all fields
-- documented above plus virtuals, hooks, and index definitions.
-- =============================================================================
