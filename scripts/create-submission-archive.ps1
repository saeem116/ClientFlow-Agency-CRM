<#
.SYNOPSIS
    ClientFlow — Submission Archive Creator (PowerShell)
.DESCRIPTION
    Creates a ZIP archive suitable for Vibe96 submission.
    Excludes: node_modules, .next, .git, build artifacts, caches,
              real environment files, credentials, and private user uploads.
.PARAMETER OutputPath
    Optional output path for the ZIP file (default: clientflow-submission.zip in project root)
.EXAMPLE
    .\scripts\create-submission-archive.ps1
.EXAMPLE
    .\scripts\create-submission-archive.ps1 -OutputPath "C:\temp\submission.zip"
#>
param(
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DefaultOutput = Join-Path $ProjectRoot "clientflow-submission.zip"
$OutputZip = if ($OutputPath) { $OutputPath } else { $DefaultOutput }

Write-Host "=== ClientFlow Submission Archive Creator ===" -ForegroundColor Cyan
Write-Host ""

# Verify we're in the right directory
if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    Write-Host "ERROR: package.json not found. Run this script from the project root." -ForegroundColor Red
    exit 1
}

# Remove any existing archive
if (Test-Path $OutputZip) {
    Remove-Item $OutputZip -Force
}

Write-Host "Creating archive: $OutputZip" -ForegroundColor Yellow
Write-Host ""

# Create temporary directory for staging
$StagingDir = Join-Path $env:TEMP "clientflow-submission-$$"
if (Test-Path $StagingDir) {
    Remove-Item $StagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

# Copy all files to staging
Write-Host "Copying files to staging..." -ForegroundColor Gray
Copy-Item -Path "$ProjectRoot\*" -Destination $StagingDir -Recurse -Force -ErrorAction SilentlyContinue

# ─────────────────────────────────────────────────────────────────────
# Phase 1: Remove directories that must never be included.
# These are top-level or subdirectory names — safe to delete entirely.
# ─────────────────────────────────────────────────────────────────────
$DirExcludes = @(
    "node_modules",
    ".next",
    ".git",
    "coverage",
    ".vscode",
    ".idea",
    ".vercel"
)
foreach ($dirName in $DirExcludes) {
    $target = Join-Path $StagingDir $dirName
    if (Test-Path $target) {
        Remove-Item $target -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Also remove any .next/* and out/* subdirectories that might exist deeper
Get-ChildItem -Path $StagingDir -Directory -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -in @('.next','out','build','node_modules') } |
    ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }

# ─────────────────────────────────────────────────────────────────────
# Phase 2: Remove specific files that must not be included.
# We use exact paths — never wildcards on directory names — to avoid
# accidentally matching and deleting unintended parent directories.
# ─────────────────────────────────────────────────────────────────────
$FileExcludes = @(
    # Environment files (exact names only — do NOT use *.env* here)
    ".env",
    ".env.local",
    ".env.test",
    ".env.production",
    ".env.development",
    # Build / lint / debug output logs
    "build-output.txt",
    "nextbuild_out.txt",
    "tsc_out.txt",
    "lint-output.txt",
    "build.log",
    "dev.db",
    "test-output.txt",
    "*.tsbuildinfo",
    "next-env.d.ts",
    # Diagnostic / one-off scripts (SMTP/avatar probes, ZIP verification helpers)
    "scripts\debug-avatar.mjs",
    "scripts\list-zip.mjs",
    "scripts\verify-zip.mjs",
    "scripts\smtp-header-inspect.mjs",
    "scripts\test-avatar.mjs",
    "scripts\test-avatar-cache.mjs",
    "scripts\test-avatar-e2e.mjs",
    "scripts\test-avatar-e2e-v2.mjs",
    "scripts\test-avatar-end-to-end.mjs",
    "scripts\test-avatar-ui.mjs",
    "scripts\test-debug.mjs",
    "scripts\test-files.mjs",
    "scripts\test-full.mjs",
    "scripts\test-replace-avatar.mjs",
    "scripts\verify-avatar.mjs",
    "scripts\verify-smtp.mjs",
    # Extra docs / notes not part of the submission
    "DARK_MODE_FIXES.md",
    "README_reset_note.txt",
    # Public placeholder SVGs (large, not needed)
    "public\file.svg",
    "public\globe.svg",
    "public\next.svg",
    "public\vercel.svg",
    "public\window.svg",
    # Test image fixtures
    "scripts\test-*.jpg",
    "scripts\test-*.png",
    "scripts\test-*.bin",
    # Private key / cert files
    "*.pem",
    "*.key",
    "*.crt",
    "*.p12",
    "*.pfx"
)

foreach ($pattern in $FileExcludes) {
    # Build the full path pattern: staging root + backslash + pattern
    $fullPattern = Join-Path $StagingDir $pattern
    Get-ChildItem -Path $fullPattern -File -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

# Also remove any .env* files that might exist at any level (e.g. .env.example is OK, but real .env files are not)
# .env.example is intentionally kept — it documents required variables
Get-ChildItem -Path $StagingDir -Filter ".env" -File -Recurse -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $StagingDir -Filter ".env.*" -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.env.example' -and $_.Name -ne '.env.template' } |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Staging prepared." -ForegroundColor Gray
Write-Host ""

# Create ZIP archive
Write-Host "Compressing archive..." -ForegroundColor Gray
Compress-Archive -Path "$StagingDir\*" -DestinationPath $OutputZip -Force

# Clean up staging
Remove-Item $StagingDir -Recurse -Force

Write-Host ""
Write-Host "=== Archive created successfully ===" -ForegroundColor Green
Write-Host ""

# Show archive size
$FileSize = (Get-Item $OutputZip).Length
$SizeMB = [math]::Round($FileSize / 1MB, 2)
Write-Host "Archive size: ${SizeMB} MB" -ForegroundColor Cyan
Write-Host "Location: ${OutputZip}" -ForegroundColor Cyan
Write-Host ""

# List key contents
Write-Host "=== Archive Contents (sample) ===" -ForegroundColor Cyan
$zip = [System.IO.Compression.ZipFile]::OpenRead($OutputZip)
$entries = $zip.Entries | Sort-Object FullName
$total = $entries.Count
Write-Host "Total entries: $total" -ForegroundColor Yellow
Write-Host ""
Write-Host "scripts/: $(($entries | Where-Object { $_.FullName -like 'scripts\*' }).Count) entries"
Write-Host "src/app/leads/: $(($entries | Where-Object { $_.FullName -like 'src\app\leads\*' }).Count) entries"
Write-Host "src/app/api/leads/: $(($entries | Where-Object { $_.FullName -like 'src\app\api\leads\*' }).Count) entries"
$zip.Dispose()
Write-Host ""

# Scan for secrets
Write-Host "=== Scanning for secrets ===" -ForegroundColor Cyan
$secretsFound = $false

# Extract and scan
$tempExtract = Join-Path $env:TEMP "clientflow-scan-$$"
Expand-Archive -Path $OutputZip -DestinationPath $tempExtract -Force

# Check for MongoDB connection strings.
# Negative lookahead excludes documented placeholders (user, pass, <user>, <pass>,
# u, p, etc.) so usage examples in scripts/ and test fixtures don't trip the
# scan. Real credentials have non-placeholder usernames and are still flagged.
$mongoPattern = 'mongodb(\+srv)?://(?!(?:user|username|password|pass|<user>|<pass>|u|p|xxx|placeholder|your-username|your-password|example):[^@\s]*@)[^"''\s]*:[^"''\s]*@'
$mongoMatches = Get-ChildItem -Path $tempExtract -Recurse -Include *.ts,*.js,*.mjs,*.json -ErrorAction SilentlyContinue |
    Select-String -Pattern $mongoPattern -ErrorAction SilentlyContinue
if ($mongoMatches) {
    Write-Host "WARNING: MongoDB connection string found in archive!" -ForegroundColor Yellow
    $secretsFound = $true
    $mongoMatches | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" -ForegroundColor Gray }
} else {
    Write-Host "MongoDB scan: PASS — no real credentials found." -ForegroundColor Green
}

# Check for common secret patterns (skip test files and the script itself)
$secretPattern = '(API_KEY|AUTH_SECRET)\s*=\s*["''][^"''\s]{16,}|SMTP_PASS\s*=\s*["''][^"''\s]{8,}'
$scanFiles = Get-ChildItem -Path $tempExtract -Recurse -Include *.ts,*.js,*.mjs,*.json -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '(__tests__|\.test\.|\.spec\.|create-submission)' }
$secretMatches = foreach ($f in $scanFiles) {
    Select-String -Path $f.FullName -Pattern $secretPattern -ErrorAction SilentlyContinue
}
if ($secretMatches) {
    Write-Host "WARNING: Potential secret pattern found in archive!" -ForegroundColor Yellow
    $secretMatches | ForEach-Object { Write-Host "  $($_.Path)" -ForegroundColor Gray }
    $secretsFound = $true
} else {
    Write-Host "Secret assignment scan: PASS — no hardcoded secrets found." -ForegroundColor Green
}

# Check for .env files (files only, not directories).
# .env.example and .env.template are intentionally kept — they document
# required variables and contain no real credentials.
$envFiles = Get-ChildItem -Path $tempExtract -Filter ".env*" -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.env.example' -and $_.Name -ne '.env.template' }
if ($envFiles) {
    Write-Host "WARNING: .env file(s) found in archive!" -ForegroundColor Yellow
    $envFiles | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Gray }
    $secretsFound = $true
} else {
    Write-Host ".env scan: PASS — no .env files found." -ForegroundColor Green
}

# Check for private key files
$keyPattern = '\.(pem|key|crt|p12|pfx)$'
$keyFiles = Get-ChildItem -Path $tempExtract -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match $keyPattern }
if ($keyFiles) {
    Write-Host "WARNING: Private key file(s) found in archive!" -ForegroundColor Yellow
    $keyFiles | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Gray }
    $secretsFound = $true
} else {
    Write-Host "Private key scan: PASS — no key files found." -ForegroundColor Green
}

# Clean up temp extraction
Remove-Item $tempExtract -Recurse -Force

Write-Host ""
if (-not $secretsFound) {
    Write-Host "=== Archive READY FOR SUBMISSION ===" -ForegroundColor Green
    Write-Host "Location: ${OutputZip}" -ForegroundColor Cyan
    Write-Host "Size: ${SizeMB} MB" -ForegroundColor Cyan
} else {
    Write-Host "Secrets detected! Remove them before submission." -ForegroundColor Red
    exit 1
}
