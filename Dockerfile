# ClientFlow — Dockerfile
#
# Multi-stage build:
#   Stage 1 (builder): Install dependencies and build the Next.js app.
#   Stage 2 (runner):  Run the production server with only production deps.
#
# Build:
#   docker build -t clientflow .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.local clientflow

# ── Stage 1: Builder ────────────────────────────────────────────────
FROM node:24-alpine AS builder

# Install dumb-init for proper PID 1 handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDeps — needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# ── Stage 2: Runner ─────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

# Install dumb-init for clean signal handling
RUN apk add --no-cache dumb-init

# Set Node environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Next.js runs on port 3000
EXPOSE 3000

# Use dumb-init as entrypoint so signals (SIGTERM) reach Next.js properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "node_modules/.bin/next", "start", "-p", "3000"]