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

# Create the archive using the exclusion list.
# The order matters: later excludes override earlier ones.
zip -r "${OUTPUT_ZIP}" . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x ".git/*" \
  -x ".gitignore" \
  -x ".dockerignore" \
  -x ".env*" \
  -x "*.log" \
  -x "build-output.txt" \
  -x "nextbuild_out.txt" \
  -x "tsc_out.txt" \
  -x "lint-output.txt" \
  -x "build.log" \
  -x "dev.db" \
  -x "*.tsbuildinfo" \
  -x "next-env.d.ts" \
  -x "coverage/*" \
  -x ".vscode/*" \
  -x ".idea/*" \
  -x "scripts/test-*.jpg" \
  -x "scripts/test-*.png" \
  -x "scripts/test-*.bin" \
  -x "DARK_MODE_FIXES.md" \
  -x "README_reset_note.txt" \
  -x "*.pem" \
  -x "*.key" \
  -x "*.crt" \
  -x "*.p12" \
  -x "*.pfx" \
  -x "package-lock.json" \
  -x "playwright-report/*" \
  -x "test-results/*" \
  -x "html-report/*" \
  -x ".next/*" \
  -x "out/*" \
  -x "build/*" \
  -x "public/file.svg" \
  -x "public/globe.svg" \
  -x "public/next.svg" \
  -x "public/vercel.svg" \
  -x "public/window.svg"

echo ""
echo "=== Archive created successfully ==="
echo ""

# Show archive contents
echo "Archive contents:"
unzip -l "${OUTPUT_ZIP}" | tail -n 5
echo ""
echo "Total files: $(unzip -l "${OUTPUT_ZIP}" | tail -n 1 | awk '{print $4}')"
echo ""

# Scan for secrets
echo "=== Scanning for secrets ==="
SECRETS_FOUND=0

# Check for MongoDB connection strings
if unzip -p "${OUTPUT_ZIP}" | grep -qE 'mongodb(\+srv)?://[^"'\''[:space:]]*:[^"'\''[:space:]]*@'; then
  echo "WARNING: MongoDB connection string found in archive!"
  SECRETS_FOUND=1
fi

# Check for common secret patterns (but ignore test files and the script itself).
# Match only actual assignments of long random-looking values (16+ chars) to secret vars,
# not references like `const { SMTP_PASS } = process.env`.
if unzip -p "${OUTPUT_ZIP}" | grep -vE '(__tests__|\.test\.|\.spec\.|create-submission|\.sh$|\.ps1$)' | grep -qE '(API_KEY|AUTH_SECRET)\s*=\s*["'\''][^"'\''[:space:]]{16,}|SMTP_PASS\s*=\s*["'\''][^"'\''[:space:]]{8,}'; then
  echo "WARNING: Potential secret pattern found in archive!"
  SECRETS_FOUND=1
fi

# Check for .env files
if unzip -l "${OUTPUT_ZIP}" | grep -qE '\.env'; then
  echo "WARNING: .env file found in archive!"
  SECRETS_FOUND=1
fi

# Check for private key files
if unzip -l "${OUTPUT_ZIP}" | grep -qE '\.(pem|key|crt|p12|pfx)$'; then
  echo "WARNING: Private key file found in archive!"
  SECRETS_FOUND=1
fi

if [ "${SECRETS_FOUND}" -eq 0 ]; then
  echo "✅ No secrets detected in archive."
else
  echo "❌ Secrets detected! Remove them before submission."
  exit 1
fi

echo ""
echo "=== Archive ready for submission ==="
echo "Location: ${OUTPUT_ZIP}"
echo ""
echo "To verify the archive, run:"
echo "  unzip -l ${OUTPUT_ZIP}"
echo ""
echo "To extract and test:"
echo "  unzip -o ${OUTPUT_ZIP} -d /tmp/clientflow-submission"