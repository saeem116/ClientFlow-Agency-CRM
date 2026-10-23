#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# ClientFlow — Submission Archive Creator
#
# Creates a ZIP archive suitable for Vibe96 submission.
# Excludes: node_modules, .next, .git, build artifacts, caches,
#           real environment files, credentials, and private user uploads.
#
# Usage:
#   bash scripts/create-submission-archive.sh
#   # or
#   ./scripts/create-submission-archive.sh
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_ZIP="${PROJECT_ROOT}/clientflow-submission.zip"

echo "=== ClientFlow Submission Archive Creator ==="
echo ""

# Verify we're in the right directory
if [ ! -f "${PROJECT_ROOT}/package.json" ]; then
  echo "ERROR: package.json not found. Run this script from the project root."
  exit 1
fi

# Remove any existing archive
rm -f "${OUTPUT_ZIP}"

echo "Creating archive: ${OUTPUT_ZIP}"
echo ""

# Create temporary directory for staging
STAGING_DIR=$(mktemp -d "/tmp/clientflow-submission-XXXXXX")
trap 'rm -rf "${STAGING_DIR}"' EXIT

# Copy all files to staging
echo "Copying files to staging..."
cp -a "${PROJECT_ROOT}/." "${STAGING_DIR}/"

# ─────────────────────────────────────────────────────────────────────
# Phase 1: Remove directories that must never be included.
# ─────────────────────────────────────────────────────────────────────
for dir in node_modules .next .git coverage .vscode .idea .vercel; do
  rm -rf "${STAGING_DIR}/${dir}" 2>/dev/null || true
done

# Also remove any deeper .next / out / build / node_modules subdirs
find "${STAGING_DIR}" -type d \( -name '.next' -o -name 'out' -o -name 'build' -o -name 'node_modules' \) -print0 2>/dev/null | xargs -0 rm -rf 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────
# Phase 2: Remove specific files that must not be included.
# Use find with -name for exact name matches only (never -path globs
# that could match parent directories).
# ─────────────────────────────────────────────────────────────────────

# Exact-file exclusions
remove_exact() {
  local pattern="$1"
  find "${STAGING_DIR}" -maxdepth 1 -name "${pattern}" -type f -delete 2>/dev/null || true
  find "${STAGING_DIR}/scripts" -maxdepth 1 -name "${pattern}" -type f -delete 2>/dev/null || true
}

remove_deep() {
  local pattern="$1"
  find "${STAGING_DIR}" -path "*/${pattern}" -type f -delete 2>/dev/null || true
}

# Environment files (exact names, depth 1 only — keep .env.example)
for ef in ".env" ".env.local" ".env.test" ".env.production" ".env.development"; do
  find "${STAGING_DIR}" -maxdepth 1 -name "${ef}" -type f -delete 2>/dev/null || true
done

# Build / lint / debug output
remove_exact "build-output.txt"
remove_exact "nextbuild_out.txt"
remove_exact "tsc_out.txt"
remove_exact "lint-output.txt"
remove_exact "build.log"
remove_exact "dev.db"
find "${STAGING_DIR}" -maxdepth 1 -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
remove_exact "next-env.d.ts"

# Diagnostic / one-off scripts
remove_exact "debug-avatar.mjs"
remove_exact "smtp-header-inspect.mjs"
remove_exact "test-avatar.mjs"
remove_exact "test-avatar-cache.mjs"
remove_exact "test-avatar-e2e.mjs"
remove_exact "test-avatar-e2e-v2.mjs"
remove_exact "test-avatar-end-to-end.mjs"
remove_exact "test-avatar-ui.mjs"
remove_exact "test-debug.mjs"
remove_exact "test-files.mjs"
remove_exact "test-full.mjs"
remove_exact "test-replace-avatar.mjs"
remove_exact "verify-avatar.mjs"
remove_exact "verify-smtp.mjs"

# Extra docs
remove_exact "DARK_MODE_FIXES.md"
remove_exact "README_reset_note.txt"

# Public placeholder SVGs
remove_exact "file.svg"
remove_exact "globe.svg"
remove_exact "next.svg"
remove_exact "vercel.svg"
remove_exact "window.svg"

# Test image fixtures
find "${STAGING_DIR}/scripts" -maxdepth 1 -name "test-*.jpg" -type f -delete 2>/dev/null || true
find "${STAGING_DIR}/scripts" -maxdepth 1 -name "test-*.png" -type f -delete 2>/dev/null || true
find "${STAGING_DIR}/scripts" -maxdepth 1 -name "test-*.bin" -type f -delete 2>/dev/null || true

# Private key / cert files (depth 1 only)
for ext in pem key crt p12 pfx; do
  find "${STAGING_DIR}" -maxdepth 1 -name "*.${ext}" -type f -delete 2>/dev/null || true
done

echo "Staging prepared."
echo ""

# Create the archive
echo "Compressing archive..."
(cd "${STAGING_DIR}" && zip -r -q "${OUTPUT_ZIP}" . -x "node_modules/*" -x ".next/*" -x ".git/*" -x "coverage/*" -x ".vscode/*" -x ".idea/*" -x ".vercel/*" -x "*.pem" -x "*.key" -x "*.crt" -x "*.p12" -x "*.pfx" -x "*.tsbuildinfo" -x "next-env.d.ts" -x "build-output.txt" -x "nextbuild_out.txt" -x "tsc_out.txt" -x "lint-output.txt" -x "build.log" -x "dev.db" -x "DARK_MODE_FIXES.md" -x "README_reset_note.txt" -x "public/file.svg" -x "public/globe.svg" -x "public/next.svg" -x "public/vercel.svg" -x "public/window.svg" -x "scripts/debug-avatar.mjs" -x "scripts/smtp-header-inspect.mjs" -x "scripts/test-avatar*" -x "scripts/test-debug.mjs" -x "scripts/test-files.mjs" -x "scripts/test-full.mjs" -x "scripts/test-replace-avatar.mjs" -x "scripts/verify-avatar.mjs" -x "scripts/verify-smtp.mjs")

echo ""
echo "=== Archive created successfully ==="
echo ""

# Show archive size
SIZE_BYTES=$(stat -c%s "${OUTPUT_ZIP}" 2>/dev/null || stat -f%z "${OUTPUT_ZIP}" 2>/dev/null)
SIZE_MB=$(awk "BEGIN {printf \"%.2f\", ${SIZE_BYTES}/1048576}")
echo "Archive size: ${SIZE_MB} MB"
echo "Location: ${OUTPUT_ZIP}"
echo ""

# List key contents
echo "=== Archive Contents (sample) ==="
TOTAL=$(unzip -l "${OUTPUT_ZIP}" | tail -n 1 | awk '{print $1}')
echo "Total entries: ${TOTAL}"
echo ""
SCRIPTS_COUNT=$(unzip -l "${OUTPUT_ZIP}" | grep -c 'scripts/' || true)
LEADS_COUNT=$(unzip -l "${OUTPUT_ZIP}" | grep -c 'src/app/leads' || true)
API_COUNT=$(unzip -l "${OUTPUT_ZIP}" | grep -c 'src/app/api/leads' || true)
echo "scripts/ entries: ${SCRIPTS_COUNT}"
echo "src/app/leads/ entries: ${LEADS_COUNT}"
echo "src/app/api/leads/ entries: ${API_COUNT}"
echo ""

# Scan for secrets
echo "=== Scanning for secrets ==="
SECRETS_FOUND=0

# Extract and scan
TEMP_EXTRACT=$(mktemp -d "/tmp/clientflow-scan-XXXXXX")
trap 'rm -rf "${STAGING_DIR}" "${TEMP_EXTRACT}"' EXIT
unzip -q "${OUTPUT_ZIP}" -d "${TEMP_EXTRACT}"

# MongoDB connection strings
if unzip -p "${OUTPUT_ZIP}" | grep -vE 'user:pass|<user>:<pass>|u:p|username:password|xxx:xxx|placeholder:placeholder' | grep -qE 'mongodb(\+srv)?://[^"'\''[:space:]]*:[^"'\''[:space:]]*@'; then
  echo "WARNING: MongoDB connection string found in archive!"
  SECRETS_FOUND=1
else
  echo "MongoDB scan: PASS — no real credentials found."
fi

# Secret assignment patterns (skip tests and the script itself)
if unzip -p "${OUTPUT_ZIP}" | grep -vE '(__tests__|\.test\.|\.spec\.|create-submission|\.sh$|\.ps1$)' | grep -qE '(API_KEY|AUTH_SECRET)\s*=\s*["'\''][^"'\''[:space:]]{16,}|SMTP_PASS\s*=\s*["'\''][^"'\''[:space:]]{8,}'; then
  echo "WARNING: Potential secret pattern found in archive!"
  SECRETS_FOUND=1
else
  echo "Secret assignment scan: PASS — no hardcoded secrets found."
fi

# .env files (files only)
if unzip -l "${OUTPUT_ZIP}" | grep -qE '\.env([./]|$)' | grep -v '\.example' | grep -q .; then
  echo "WARNING: .env file found in archive!"
  SECRETS_FOUND=1
else
  echo ".env scan: PASS — no .env files found."
fi

# Private key files
if unzip -l "${OUTPUT_ZIP}" | grep -qE '\.(pem|key|crt|p12|pfx)$'; then
  echo "WARNING: Private key file found in archive!"
  SECRETS_FOUND=1
else
  echo "Private key scan: PASS — no key files found."
fi

echo ""
if [ "${SECRETS_FOUND}" -eq 0 ]; then
  echo "=== Archive READY FOR SUBMISSION ==="
  echo "Location: ${OUTPUT_ZIP}"
  echo "Size: ${SIZE_MB} MB"
else
  echo "Secrets detected! Remove them before submission."
  exit 1
fi
