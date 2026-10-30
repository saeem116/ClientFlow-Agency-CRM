# ClientFlow — Agency CRM

A full-featured agency CRM built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and MongoDB Atlas. Designed for creative agencies to manage clients, projects, tasks, leads, invoices, and team collaboration.

## Features

- **Client Management** — Create, edit, search, and deactivate clients with company details and notes.
- **Project Tracking** — Track project status (Draft / Active / On Hold / Completed), priority, budget, and milestones.
- **Task Board** — Kanban-style task management with status flow: Backlog → In Progress → In Review → Done.
- **Invoicing** — Generate invoices with line items, tax rates, and payment tracking. Record payments and auto-calculate totals.
- **Lead Pipeline** — Manage leads through stages (New → Contacted → Qualified → Proposal Sent → Won / Lost).
- **File Storage** — Upload files (images, PDFs, documents) to MongoDB GridFS with size and type validation.
- **Team Invitations** — Invite team members via email with secure token-based acceptance links.
- **Role-Based Access** — ADMIN, MEMBER, CLIENT roles with organization-scoped data isolation.
- **Notifications** — In-app notifications for project updates, task assignments, and payments.
- **Global Search** — Search across all entities within your organization.
- **Dark Mode** — Toggle between light and dark themes.

## Tech Stack

- **Framework**: Next.js 16.4.2 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **UI**: React 19.3.0, Tailwind CSS v4, shadcn/ui components
- **Database**: MongoDB Atlas via Mongoose 8.10
- **Storage**: MongoDB GridFS for file uploads
- **Auth**: Custom session tokens signed with HMAC-SHA256
- **Validation**: Zod for input validation
- **Testing**: Vitest (unit/integration), Playwright (E2E)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables (see `.env.example` for descriptions):

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `AUTH_SECRET` | HMAC secret for session tokens (≥32 random chars) |
| `ADMIN_EMAIL` | Email address with admin access to `/admin/users` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP settings for invitation emails (optional) |
| `NEXT_PUBLIC_AVATAR_BASE_URL` | Absolute URL for avatar images (recommended for production) |

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd clientflow

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your credentials
```

## Running the Application

```bash
# Development server (with Turbopack)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

### MongoDB Atlas (Production)

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Get your connection string (it looks like `mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/<db>`).
3. Set `MONGODB_URI` in `.env.local`.
4. Run the index migration after first deploy:
   ```bash
   node database/migrations/001-create-indexes.js
   ```

### Local MongoDB

Install MongoDB Community Edition locally or use Docker:

```bash
docker run -d -p 27017:27017 --name mongo mongo:latest
```

Then set `MONGODB_URI=mongodb://localhost:27017/clientflow`.

## Demo Data

To seed realistic fake data for demonstration:

```bash
# Seed demo data (safe, idempotent — never overwrites existing records)
node scripts/seed-demo.js
```

The script creates fake users (`admin@demo.test` and `member@demo.test`) with randomly generated passwords printed to the console. **Never run this against a production database.**

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires built app)
npm run test:e2e

# All tests
npm run test:all
```

Tests connect to a separate test database (`TEST_MONGODB_URI` or `mongodb://localhost:27017/clientflow-test`). The production `MONGODB_URI` is never used by the test suite.

## Linting & Type Checking

```bash
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript check
```

## Deployment

### Vercel (Recommended)

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add environment variables in Vercel project settings.
4. Deploy — Vercel handles builds automatically.

### Docker

A Dockerfile is provided. Build and run:

```bash
docker build -t clientflow .
docker run -p 3000:3000 --env-file .env.local clientflow
```

Or use Docker Compose:

```bash
docker compose up -d
```

### VPS (Manual Deployment)

1. Install Node.js 24+ (LTS) and MongoDB on your server.
2. Clone the repository.
3. Run `npm install --production`.
4. Set environment variables (use a process manager or systemd).
5. Build: `npm run build`.
6. Start: `npm start`.
7. Reverse-proxy with Nginx (see `HowToSetup.md` for details).

## Security

- Session tokens are HMAC-SHA256 signed using `AUTH_SECRET`.
- All API routes enforce authentication and organization scoping.
- Passwords are hashed with bcrypt (12 rounds).
- File uploads validate content types and image magic bytes.
- Invitation tokens are SHA-256 hashed before storage.
- The `/admin/*` routes are protected by edge middleware and server-side role checks.

## Contribution

Pull requests are welcome. Please ensure all tests pass (`npm run test:all`) and linting is clean (`npm run lint`) before submitting.

## License

Private — ClientFlow Agency CRM © 2026