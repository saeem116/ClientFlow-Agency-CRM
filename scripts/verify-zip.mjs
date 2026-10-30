import fs from 'fs'
import { execSync } from 'child_process'

const zipPath = 'E:/Agency_CRM/clientflow/clientflow-submission.zip'
const size = fs.statSync(zipPath).size
console.log(`ZIP size: ${(size / 1048576).toFixed(2)} MB (${size} bytes)`)

// Count entries
const list = execSync(`zipinfo -1 "${zipPath}"`, { encoding: 'utf8' })
// Normalize: ZIP on Windows stores paths with backslashes; compare with forward slashes.
const files = list.trim().split('\n').map(f => f.replace(/\\/g, '/'))
console.log(`Total files in ZIP: ${files.length}`)

// Show key files
const keyFiles = [
  'src/app/api/tasks/[id]/route.ts',
  'src/app/api/milestones/[id]/route.ts',
  'src/app/projects/[id]/project-detail-client.tsx',
  'src/app/projects/[id]/page.tsx',
  'src/__tests__/auth/task-milestone-demo.test.ts',
  'src/lib/database-scoped.ts',
  'src/lib/session-secret.ts',
  'src/app/api/auth/password/route.ts',
  'src/app/profile/page.tsx',
  'src/app/profile/profile-page.tsx',
  '.env.example',
  'scripts/seed-demo-public.js',
  'AGENTS.md',
  'CLAUDE.md',
  'database/schema.sql',
  'database/seed.sql',
]
console.log('\nKey files present:')
for (const f of keyFiles) {
  console.log(files.includes(f) ? `  [OK] ${f}` : `  [MISSING] ${f}`)
}

// Scan for secrets
const buffer = fs.readFileSync(zipPath)
const text = buffer.toString('utf8')

// MongoDB URIs (look for real-looking ones with credentials)
const mongoMatches = text.match(/mongodb(\+srv)?:\/\/[^s@\s"']+(?::[^@\s"']+)?@/g)
if (mongoMatches) {
  console.log('\nWARNING: Found MongoDB connection strings:')
  mongoMatches.forEach(m => console.log(`  ${m.substring(0, 50)}...`))
} else {
  console.log('\nMongoDB scan: PASS — no real credentials found.')
}

// Hardcoded secrets
const secretPattern = /(?:AUTH_SECRET|API_KEY|SMTP_PASS)\s*[:=]\s*["']?([^\s"']{16,})/g
let match
while ((match = secretPattern.exec(text)) !== null) {
  console.log(`WARNING: Potential secret: ${match[1].substring(0, 20)}...`)
}

// Check .env files (should only have .env.example)
const envFiles = files.filter(f => /\.env(\.[^.]+)?$/.test(f) && !f.includes('.env.example'))
if (envFiles.length > 0) {
  console.log(`WARNING: Found real .env files in archive: ${envFiles.join(', ')}`)
} else {
  console.log('.env scan: PASS — only .env.example present.')
}
