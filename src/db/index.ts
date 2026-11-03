import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'
import { mkdirSync } from 'node:fs'

mkdirSync('data', { recursive: true })
const sqlite = new Database('data/talenthub.db')
// Enable foreign keys
sqlite.exec('PRAGMA foreign_keys = ON;')

// Ensure trial_claims table exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS trial_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    corporate_domain TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    phone_whatsapp TEXT NOT NULL,
    otp_code TEXT,
    otp_expires_at TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    claimed_at TEXT,
    ip_address TEXT
  );

  CREATE TABLE IF NOT EXISTS payment_invoices (
    id TEXT PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount_idr INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    provider TEXT DEFAULT 'mock_midtrans',
    paid_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`)

export const db = drizzle(sqlite, { schema })
export { sqlite }
