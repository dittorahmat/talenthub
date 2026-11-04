import { existsSync, mkdirSync } from 'node:fs'
import { Database } from 'bun:sqlite'

/**
 * Test preload: keeps the local development database compatible with the
 * current schema without requiring a full reseed before every test run.
 */
if (!existsSync('data')) {
  mkdirSync('data', { recursive: true })
}

if (existsSync('data/talenthub.db')) {
  const db = new Database('data/talenthub.db')
  const columns = db.prepare('PRAGMA table_info(trial_claims)').all() as Array<{ name: string }>
  if (columns.length > 0) {
    const names = new Set(columns.map((column) => column.name))
    if (!names.has('otp_hash')) {
      db.exec('ALTER TABLE trial_claims ADD COLUMN otp_hash TEXT;')
    }
    if (!names.has('otp_attempts')) {
      db.exec('ALTER TABLE trial_claims ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0;')
    }
  }
  db.close()
}
