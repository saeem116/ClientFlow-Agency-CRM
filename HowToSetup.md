# ClientFlow — Setup Guide

This guide covers installation, configuration, and deployment for ClientFlow Agency CRM.

## Prerequisites

- Node.js 20+ 
- MongoDB Atlas account (free tier OK) or local MongoDB
- Git
- A domain name (for production)

## Quick Start — Local Development (Node.js + MongoDB)

```bash
# 1. Clone the repository
git clone https://github.com/saeem116/ClientFlow-Agency-CRM.git
cd ClientFlow-Agency-CRM/clientflow

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — see Configuration section below

# 4. Start MongoDB (if not using Atlas)
# Option A: Docker (recommended for local)
docker run -d -p 27017:27017 --name mongo -e MONGO_INITDB_DATABASE=clientflow mongo:7

# Option B: Local MongoDB installation

# 5. Run the index migration (required for first time)
node database/migrations/001-create-indexes.js

# 6. Seed demo data (optional, for testing)
node scripts/seed-demo.js

# 7. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quick Start — Docker Compose (Recommended for Local)

The project includes a `docker-compose.yml` with Next.js app and MongoDB.

```bash
# 1. Clone the repository
git clone https://github.com/saeem116/ClientFlow-Agency-CRM.git
cd ClientFlow-Agency-CRM/clientflow

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your values (see Configuration section)

# 3. Start the stack
docker compose up -d

# 4. Run database initialization (creates collections & indexes)
docker compose exec app node database/schema.js

# 5. Seed demo data (optional)
docker compose exec app node database/seed.js
# Requires DEMO_SEED_MONGODB_URI and DEMO_REVIEWER_PASSWORD in .env.local

# 6. Access the app
# http://localhost:3000
```

The `docker-compose.yml` includes:
- **app**: Next.js production build (multi-stage Dockerfile)
- **mongo**: MongoDB 7 with persistent volume `mongo_data`
- Health checks on both services
- Automatic service dependency (app waits for mongo healthy)

To stop: `docker compose down`  
To stop and remove volumes: `docker compose down -v`

Open [http://localhost:3000](http://localhost:3000).

## Configuration

### Required Environment Variables

See `.env.example` for the complete list. At minimum, set:

```bash
MONGODB_URI="mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/clientflow"
AUTH_SECRET="<32+ random characters>"
ADMIN_EMAIL="your-email@example.com"
```

### Generating AUTH_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### SMTP (Optional)

Invitation emails require SMTP configuration. For Gmail:

1. Enable 2FA on your Google account.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Create an app password for "Mail".
4. Set `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` in `.env.local`.

## MongoDB Setup

### MongoDB Atlas (Recommended)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free cluster (M0).
3. Create a database user (note the username and password).
4. Click "Connect" → "Connect your application" → copy the connection string.
5. Replace `<password>` in the connection string.
6. Set `MONGODB_URI` to this connection string.

### Local MongoDB

**Using Docker:**
```bash
docker run -d -p 27017:27017 --name mongo -e MONGO_INITDB_DATABASE=clientflow mongo:latest
```

Set `MONGODB_URI="mongodb://localhost:27017/clientflow"`.

## Creating the First Admin

After starting the app:

1. Navigate to [http://localhost:3000/signup](http://localhost:3000/signup).
2. Register your first account — you will automatically become the ADMIN of your workspace.
3. Set `ADMIN_EMAIL` in `.env.local` to your email address to enable access to `/admin/users`.

Or use the demo seed script:
```bash
node scripts/seed-demo.js
# It will print the admin credentials to the console.
```

## Database Migrations

Run migrations in order:

```bash
# 1. Create indexes
node database/migrations/001-create-indexes.js

# 2. Seed demo data (only if needed for testing)
node scripts/seed-demo.js
```

Migrations are non-destructive and idempotent — safe to run multiple times.

## Building for Production

```bash
npm run build
npm start
```

The build output is in `.next/`. Set `NODE_ENV=production` (Vercel does this automatically).

## Vercel Deployment

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. In Vercel project settings, add environment variables from `.env.local`.
4. Deploy — Vercel builds and deploys automatically on push.

### Vercel Environment Variables

Copy these from `.env.local` to Vercel:
- `MONGODB_URI`
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` (if using email)
- `EMAIL_FROM`
- `NEXT_PUBLIC_APP_URL` (set to your production URL)
- `NEXT_PUBLIC_AVATAR_BASE_URL` (set to your production URL)

## Docker Deployment

### Docker Compose (Recommended)

The project includes a complete `docker-compose.yml` with Next.js app, MongoDB, persistent volumes, health checks, and proper networking.

```bash
# 1. Clone and configure
git clone https://github.com/saeem116/ClientFlow-Agency-CRM.git
cd ClientFlow-Agency-CRM/clientflow
cp .env.example .env.local
# Edit .env.local with your values

# 2. Start the stack
docker compose up -d

# 3. Initialize database schema (creates collections & indexes)
docker compose exec app node database/schema.js

# 4. Seed demo data (optional)
docker compose exec app node database/seed.js
# Requires DEMO_SEED_MONGODB_URI and DEMO_REVIEWER_PASSWORD in .env.local

# 5. Access at http://localhost:3000
```

**docker-compose.yml highlights:**
- Multi-stage Dockerfile (builder → runner) for small production image
- MongoDB 7 with named volume `mongo_data` for persistence
- Health checks on both services (`mongosh ping` and `wget /api/health`)
- App waits for MongoDB to be healthy before starting
- Restart policy `unless-stopped` for both services
- Environment via `.env.local` (mounted, not baked into image)

### Docker Build & Run (Manual)

```bash
# Build the Docker image
docker build -t clientflow .

# Run with environment variables (requires external MongoDB)
docker run -d \
  -p 3000:3000 \
  --env-file .env.local \
  --name clientflow \
  clientflow
```

For manual runs, ensure `MONGODB_URI` in `.env.local` points to an accessible MongoDB instance (not `localhost` inside the container).

## VPS Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Step 2: Clone and Install

```bash
cd /opt
git clone https://github.com/saeem116/ClientFlow-Agency-CRM.git
cd ClientFlow-Agency-CRM/clientflow
npm install --production
npm run build
```

### Step 3: PM2 Process Manager

```bash
npm install -g pm2
pm2 start npm --name "clientflow" -- start
pm2 save
pm2 startup
```

### Step 4: Nginx Reverse Proxy

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/clientflow
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/clientflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Database Connection Errors

- Verify `MONGODB_URI` is correct.
- Check MongoDB Atlas IP whitelist allows your deployment.
- Ensure the database user has read/write permissions.

### Build Failures

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### TypeScript Errors

```bash
npx tsc --noEmit
```

### Test Failures

Ensure `TEST_MONGODB_URI` points to a local test database, not the production one.

## Security Notes

- **Never commit `.env.local`** — it contains real credentials.
- **Rotate `AUTH_SECRET`** if it's ever exposed.
- **Use strong passwords** for MongoDB and SMTP.
- **Enable HTTPS** in production (Vercel provides this automatically).
- **Monitor MongoDB** for unusual access patterns.