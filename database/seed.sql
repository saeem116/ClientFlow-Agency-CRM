-- =============================================================================
-- ClientFlow Agency CRM — Seed Data (SQL Reference)
-- =============================================================================
-- This file documents the demo data structure used by ClientFlow.
-- The application uses MongoDB with Mongoose. Run the JS seed scripts instead:
--
--   # Local dev seed
--   node scripts/seed-demo.js
--
--   # Rich demo seed (2 users, 3 clients, 2 leads, 2 projects, 3 tasks, 1 invoice)
--   node database/migrations/002-seed-demo-data.js
--
--   # Public demo seed (reviewer account)
--   CONFIRM_DEMO_SEED=YES \
--   DEMO_SEED_MONGODB_URI=mongodb://localhost:27017/clientflow_demo \
--   DEMO_REVIEWER_PASSWORD="MyDemoPassword!2026" \
--   node scripts/seed-demo-public.js
-- =============================================================================

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────────────
INSERT INTO organizations (id, name, slug) VALUES
    ('507f1f77bcf86cd799439011', 'Demo Agency', 'demo-agency'),
    ('507f1f77bcf86cd799439012', 'Acme Corp', 'acme-corp');

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- Passwords are bcrypt hashes generated at runtime. Example hash for demo:
-- $2a$12$LlHKzVgVb0bVPy7dHKpF6uXmYz7mC3r5yJlBnNkE5tQ6zP8wX1Y2e
INSERT INTO users (id, email, name, password, role) VALUES
    ('507f1f77bcf86cd799439021', 'admin@demoagency.test',   'Demo Admin',      '$2a$12$LlHKzVgVb0bVPy7dHKpF6uXmYz7mC3r5yJlBnNkE5tQ6zP8wX1Y2e', 'ADMIN'),
    ('507f1f77bcf86cd799439022', 'member@demoagency.test',  'Demo Member',     '$2a$12$LlHKzVgVb0bVPy7dHKpF6uXmYz7mC3r5yJlBnNkE5tQ6zP8wX1Y2e', 'MEMBER'),
    ('507f1f77bcf86cd799439023', 'reviewer@clientflow.test', 'Reviewer',       '$2a$12$LlHKzVgVb0bVPy7dHKpF6uXmYz7mC3r5yJlBnNkE5tQ6zP8wX1Y2e', 'MEMBER');

-- ─── MEMBERSHIPS ─────────────────────────────────────────────────────────────
INSERT INTO memberships (id, userId, organizationId, role) VALUES
    ('507f1f77bcf86cd799439031', '507f1f77bcf86cd799439021', '507f1f77bcf86cd799439011', 'ADMIN'),
    ('507f1f77bcf86cd799439032', '507f1f77bcf86cd799439022', '507f1f77bcf86cd799439011', 'MEMBER'),
    ('507f1f77bcf86cd799439033', '507f1f77bcf86cd799439023', '507f1f77bcf86cd799439011', 'MEMBER');

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
INSERT INTO clients (id, firstName, lastName, companyName, email, phone, status, organizationId, createdById) VALUES
    ('507f1f77bcf86cd799439041', 'Alice',   'Johnson',    'TechStart Inc',     'alice@techstart.test', '555-0101', 'active',   '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021'),
    ('507f1f77bcf86cd799439042', 'Bob',     'Smith',      'MediaWorks LLC',    'bob@mediaworks.test',  '555-0102', 'active',   '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021'),
    ('507f1f77bcf86cd799439043', 'Carol',   'Davis',      'GreenBuild Co',     'carol@greenbuild.test','555-0103', 'prospect', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021');

-- ─── LEADS ───────────────────────────────────────────────────────────────────
INSERT INTO leads (id, title, description, email, stage, source, value, organizationId, createdById) VALUES
    ('507f1f77bcf86cd799439051', 'E-commerce platform redesign', 'Full stack rebuild',  'contact@retailgiant.test',  'QUALIFIED', 'WEBSITE',  50000.00, '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021'),
    ('507f1f77bcf86cd799439052', 'Mobile app development',       'iOS and Android',    'dev@startupx.test',         'NEW',       'REFERRAL', 80000.00, '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021');

-- ─── PROJECTS ────────────────────────────────────────────────────────────────
INSERT INTO projects (id, name, description, status, priority, budget, startDate, endDate, clientId, organizationId, createdById) VALUES
    ('507f1f77bcf86cd799439061', 'TechStart Website',      'Corporate website redesign', 'ACTIVE',   'HIGH',   15000.00, '2026-01-01', '2026-03-31', '507f1f77bcf86cd799439041', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021'),
    ('507f1f77bcf86cd799439062', 'MediaWorks Dashboard',   'Internal analytics dashboard', 'DRAFT',    'MEDIUM', 25000.00, NULL,         NULL,           '507f1f77bcf86cd799439042', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021');

-- ─── MILESTONES ──────────────────────────────────────────────────────────────
INSERT INTO milestones (id, title, description, dueDate, completedAt, projectId) VALUES
    ('507f1f77bcf86cd799439071', 'Design Phase',       'Complete UI/UX mockups',         '2026-01-31', NULL, '507f1f77bcf86cd799439061'),
    ('507f1f77bcf86cd799439072', 'Development Phase',  'Build and integrate backend',    '2026-02-28', NULL, '507f1f77bcf86cd799439061'),
    ('507f1f77bcf86cd799439073', 'Launch',             'Deploy to production',           '2026-03-31', NULL, '507f1f77bcf86cd799439061');

-- ─── TASKS ───────────────────────────────────────────────────────────────────
INSERT INTO tasks (id, title, description, status, priority, dueDate, completedAt, projectId, milestoneId, assigneeId, organizationId, createdById) VALUES
    ('507f1f77bcf86cd799439081', 'Design homepage mockup',  'Figma prototype',          'DONE',     'HIGH',   '2026-01-15', '2026-01-15', '507f1f77bcf86cd799439061', '507f1f77bcf86cd799439071', '507f1f77bcf86cd799439022', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021'),
    ('507f1f77bcf86cd799439082', 'Set up CI/CD pipeline',   'GitHub Actions config',    'IN_PROGRESS','MEDIUM', '2026-02-15', NULL,     '507f1f77bcf86cd799439061', '507f1f77bcf86cd799439071', '507f1f77bcf86cd799439022', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021'),
    ('507f1f77bcf86cd799439083', 'Write API documentation', 'OpenAPI spec',             'BACKLOG',  'LOW',    NULL,         NULL,     '507f1f77bcf86cd799439062', NULL,         NULL,               '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021');

-- ─── INVOICES ────────────────────────────────────────────────────────────────
INSERT INTO invoices (id, number, clientId, projectId, status, issueDate, dueDate, subtotal, taxRate, taxAmount, total, paidAmount, organizationId, createdById) VALUES
    ('507f1f77bcf86cd799439091', 'INV-2026-0001', '507f1f77bcf86cd799439041', '507f1f77bcf86cd799439061', 'SENT', '2026-01-15', '2026-02-15', 12000.00, 10.00, 1200.00, 13200.00, 0.00, '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021');

-- ─── INVOICE LINE ITEMS ──────────────────────────────────────────────────────
INSERT INTO invoice_line_items (id, description, quantity, unitPrice, amount, invoiceId) VALUES
    ('507f1f77bcf86cd799439101', 'Website design',           1, 8000.00, 8000.00, '507f1f77bcf86cd799439091'),
    ('507f1f77bcf86cd799439102', 'Development',              40, 100.00, 4000.00, '507f1f77bcf86cd799439091');

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
-- No payments recorded yet for demo invoice.

-- ─── ACTIVITIES ──────────────────────────────────────────────────────────────
INSERT INTO activities (id, type, description, entityId, entityType, userId, organizationId) VALUES
    ('507f1f77bcf86cd799439111', 'PROJECT_CREATED',   'Created project TechStart Website', '507f1f77bcf86cd799439061', 'project', '507f1f77bcf86cd799439021', '507f1f77bcf86cd799439011'),
    ('507f1f77bcf86cd799439112', 'TASK_COMPLETED',    'Completed Design homepage mockup',    '507f1f77bcf86cd799439081', 'task',    '507f1f77bcf86cd799439022', '507f1f77bcf86cd799439011');

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
INSERT INTO notifications (id, userId, type, title, description, link, readAt, organizationId) VALUES
    ('507f1f77bcf86cd799439121', '507f1f77bcf86cd799439022', 'TASK_ASSIGNED', 'New task assigned', 'Design homepage mockup has been assigned to you', '/tasks', NULL, '507f1f77bcf86cd799439011');

-- ─── INVITATIONS ─────────────────────────────────────────────────────────────
-- Invitation tokens are hashed with SHA-256. The following are example entries.
-- In production, tokens are generated with crypto.getRandomValues().
INSERT INTO invitations (id, email, tokenHash, role, organizationId, invitedById, expiresAt) VALUES
    ('507f1f77bcf86cd799439131', 'newmember@example.com', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'MEMBER', '507f1f77bcf86cd799439011', '507f1f77bcf86cd799439021', '2026-12-31 23:59:59');

-- =============================================================================
-- MONGODB ALTERNATIVE
-- =============================================================================
-- This project uses MongoDB with Mongoose 8. The equivalent MongoDB seed is
-- performed by running one of the JS seed scripts documented above.
--
-- Demo credentials (passwords generated at runtime):
--   admin@demoagency.test     (ADMIN)   — see console output after seed
--   member@demoagency.test    (MEMBER)  — same password as admin
--   reviewer@clientflow.test  (MEMBER)  — set via DEMO_REVIEWER_PASSWORD
-- =============================================================================
