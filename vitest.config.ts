import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

function loadEnvFile(file: string): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    const content = readFileSync(path.resolve(__dirname, file), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.substring(0, eqIndex).trim()
      let value = trimmed.substring(eqIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
  } catch {}
  return env
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') }

// Force set on process.env — tests MUST use TEST_MONGODB_URI only.
// This is the hard safeguard: MONGODB_URI (the production connection string)
// is never allowed to leak into the test suite.
if (env.TEST_MONGODB_URI) {
  process.env.TEST_MONGODB_URI = env.TEST_MONGODB_URI
}
// Explicitly unset any production env that vitest might have inherited
delete process.env.MONGODB_URI
if (env.MONGODB_URI) {
  console.warn(
    '[vitest.config] MONGODB_URI detected in .env — IGNORING to prevent tests ' +
    'from connecting to the production database. Set TEST_MONGODB_URI to point ' +
    'tests at a dedicated test database.'
  )
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env,
    setupFiles: ['./src/__tests__/utils/setup.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        '**/*.config.*',
        'src/app/**/?(*.){ts,tsx}'
      ]
    },
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'src/app/api',
      'tests'
    ],
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'forks'
  }
})