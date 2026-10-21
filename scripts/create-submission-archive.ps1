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

# Copy all files to staging, then remove excluded items
Write-Host "Copying files to staging..." -ForegroundColor Gray
Copy-Item -Path "$ProjectRoot\*" -Destination $StagingDir -Recurse -Force -ErrorAction SilentlyContinue

# Exclude patterns
$Excludes = @(
    "node_modules",
    ".next",
    ".git",
    ".env",
    ".env.local",
    ".env.test",
    ".env.production",
    ".env.*",
    "*.log",
    "build-output.txt",
    "nextbuild_out.txt",
    "tsc_out.txt",
    "lint-output.txt",
    "build.log",
    "dev.db",
    "*.tsbuildinfo",
    "next-env.d.ts",
    "coverage",
    ".vscode",
    ".idea",
    "scripts/test-*.jpg",
    "scripts/test-*.png",
    "scripts/test-*.bin",
    "DARK_MODE_FIXES.md",
    "README_reset_note.txt",
    "public/file.svg",
    "public/globe.svg",
    "public/next.svg",
    "public/vercel.svg",
    "public/window.svg"
)

foreach ($pattern in $Excludes) {
    $items = Get-ChildItem -Path $StagingDir -Filter $pattern -Recurse -ErrorAction SilentlyContinue
    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            Remove-Item -Path $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            Remove-Item -Path $item.FullName -Force -ErrorAction SilentlyContinue
        }
    }
}

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

# List contents
Write-Host "=== Archive Contents ===" -ForegroundColor Cyan
$zip = [System.IO.Compression.ZipFile]::OpenRead($OutputZip)
$zip.Entries | ForEach-Object { Write-Host "  $($_.FullName)" }
$zip.Dispose()
Write-Host ""
Write-Host "Total entries: $($zip.Entries.Count)" -ForegroundColor Yellow
Write-Host ""

# Scan for secrets
Write-Host "=== Scanning for secrets ===" -ForegroundColor Cyan
$secretsFound = $false

# Extract and scan
$tempExtract = Join-Path $env:TEMP "clientflow-scan-$$"
Expand-Archive -Path $OutputZip -DestinationPath $tempExtract -Force

# Check for MongoDB connection strings
$mongoPattern = 'mongodb(\+srv)?://[^"''\s]*:[^"''\s]*@'
if (Get-ChildItem -Path $tempExtract -Recurse -Include *.ts,*.js,*.mjs,*.json,*.env* -ErrorAction SilentlyContinue |
    Select-String -Pattern $mongoPattern -ErrorAction SilentlyContinue) {
    Write-Host "WARNING: MongoDB connection string found in archive!" -ForegroundColor Yellow
    $secretsFound = $true
}

# Check for common secret patterns (skip test files and the script itself)
# Match only actual assignments of long random-looking values (16+ chars) to secret vars,
# not references like `const { SMTP_PASS } = process.env`.
$secretPattern = '(API_KEY|AUTH_SECRET)\s*=\s*["''][^"''\s]{16,}|SMTP_PASS\s*=\s*["''][^"''\s]{8,}'
$scanFiles = Get-ChildItem -Path $tempExtract -Recurse -Include *.ts,*.js,*.mjs,*.json -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '(__tests__|\.test\.|\.spec\.|create-submission)' }
$secretMatches = $scanFiles | Select-String -Pattern $secretPattern -ErrorAction SilentlyContinue
if ($secretMatches) {
    Write-Host "WARNING: Potential secret pattern found in archive!" -ForegroundColor Yellow
    $secretMatches | ForEach-Object { Write-Host "  $($_.Path)" -ForegroundColor Gray }
    $secretsFound = $true
}

# Check for .env files
if (Get-ChildItem -Path $tempExtract -Recurse -Filter ".env*" -ErrorAction SilentlyContinue) {
    Write-Host "WARNING: .env file found in archive!" -ForegroundColor Yellow
    $secretsFound = $true
}

# Check for private key files
$keyPattern = '\.(pem|key|crt|p12|pfx)$'
if (Get-ChildItem -Path $tempExtract -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match $keyPattern }) {
    Write-Host "WARNING: Private key file found in archive!" -ForegroundColor Yellow
    $secretsFound = $true
}

# Clean up temp extraction
Remove-Item $tempExtract -Recurse -Force

if (-not $secretsFound) {
    Write-Host "No secrets detected in archive." -ForegroundColor Green
} else {
    Write-Host "Secrets detected! Remove them before submission." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Archive ready for submission ===" -ForegroundColor Green
Write-Host ""
Write-Host "To verify the archive, run:" -ForegroundColor Gray
Write-Host "  Get-ChildItem '$OutputZip'"
Write-Host ""
Write-Host "To extract and test:" -ForegroundColor Gray
Write-Host "  Expand-Archive -Path '$OutputZip' -DestinationPath 'C:\temp\clientflow-submission' -Force"