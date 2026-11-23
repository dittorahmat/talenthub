import { existsSync, mkdirSync } from 'node:fs'
import { Database } from 'bun:sqlite'

/**
 * Test preload: keeps the local development database compatible with the
 * current schema without requiring a full reseed before every test run.
 */
if (!existsSync('data')) {
  mkdirSync('data', { recursive: true })
}

const db = new Database('data/talenthub.db')

// Ensure critical auth and domain tables exist idempotenly so test runners never fail with SQLiteError: no such table
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'recruiter',
    organizationId INTEGER
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expiresAt TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt TEXT,
    refreshTokenExpiresAt TEXT,
    scope TEXT,
    password TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    remote TEXT DEFAULT 'No',
    posted_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applicants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT,
    resume_path TEXT,
    resume_filename TEXT,
    resume_keywords TEXT,
    source TEXT DEFAULT 'JobStreet',
    status TEXT NOT NULL DEFAULT 'Applied',
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    screening_status TEXT DEFAULT 'pending',
    screening_summary TEXT,
    screening_score INTEGER,
    screening_band TEXT,
    screening_verdict TEXT,
    screening_matched TEXT,
    screening_missing TEXT,
    screening_exp_years INTEGER
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_knockouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    question TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inbox_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    keywords TEXT,
    score INTEGER,
    band TEXT,
    verdict TEXT,
    rationale TEXT,
    knockout_result TEXT,
    duplicate_of INTEGER,
    promoted_applicant_id INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credit_wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL REFERENCES credit_wallets(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    balance_after INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trial_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    ip_subnet TEXT NOT NULL,
    device_hash TEXT,
    status TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    otp_code TEXT,
    otp_expires_at TEXT,
    otp_hash TEXT,
    otp_attempts INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    status TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_channel TEXT,
    payment_reference TEXT,
    payment_payload TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL,
    paid_at TEXT,
    expired_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS candidate_share_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outreach_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS candidate_scorecards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    evaluator_id TEXT NOT NULL,
    evaluator_name TEXT NOT NULL,
    technical_score INTEGER NOT NULL,
    culture_score INTEGER NOT NULL,
    communication_score INTEGER NOT NULL,
    recommendation TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS candidate_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`)

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

const jobColumns = db.prepare('PRAGMA table_info(jobs)').all() as Array<{ name: string }>
if (jobColumns.length > 0) {
  const names = new Set(jobColumns.map((col) => col.name))
  if (!names.has('pipeline_stages')) {
    db.exec('ALTER TABLE jobs ADD COLUMN pipeline_stages TEXT;')
  }
  if (!names.has('auto_screen_public')) {
    db.exec('ALTER TABLE jobs ADD COLUMN auto_screen_public INTEGER DEFAULT 0;')
  }
  if (!names.has('daily_public_screening_cap')) {
    db.exec('ALTER TABLE jobs ADD COLUMN daily_public_screening_cap INTEGER DEFAULT 20;')
  }
}

db.close()
