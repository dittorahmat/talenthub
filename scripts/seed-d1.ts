import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

/**
 * scripts/seed-d1.ts
 * Generates reproducible D1 SQL migration/seed queries from local seed or runs them via wrangler d1 execute.
 */

console.log('Generating reproducible D1 SQL schema and seed data...')

// 1. Ensure local SQLite has fresh schema and seeds
execSync('bun run init-db', { stdio: 'inherit' })
execSync('bun run seed', { stdio: 'inherit' })

// 2. Dump local SQLite to SQL statements
const dump = execSync('sqlite3 data/talenthub.db .dump', { encoding: 'utf-8' })

// 3. Clean dump for Cloudflare D1 compatibility:
// Cloudflare D1 does not allow manual BEGIN TRANSACTION / COMMIT blocks in batch imports.
const cleanedSql = dump
  .split('\n')
  .filter((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('PRAGMA ')) return false
    if (trimmed.startsWith('BEGIN TRANSACTION')) return false
    if (trimmed.startsWith('COMMIT')) return false
    return true
  })
  .join('\n')

const sqlFilePath = 'data/d1-schema-seed.sql'
writeFileSync(sqlFilePath, cleanedSql, 'utf-8')
console.log(`✓ D1 SQL schema and seed script saved to ${sqlFilePath}`)

// 4. If --remote is passed, execute directly against talenthub-db
if (process.argv.includes('--remote')) {
  console.log('Deploying schema & seed to remote Cloudflare D1 (talenthub-db)...')
  execSync(`npx wrangler d1 execute talenthub-db --remote --file=${sqlFilePath}`, { stdio: 'inherit' })
  console.log('✓ Successfully synchronized remote Cloudflare D1!')
}
