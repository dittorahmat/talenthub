import { sqlite } from '../src/db'

sqlite.exec(`
  DROP TABLE IF EXISTS credit_transactions;
  DROP TABLE IF EXISTS credit_wallets;
  DROP TABLE IF EXISTS inbox_items;
  DROP TABLE IF EXISTS job_knockouts;
  DROP TABLE IF EXISTS activities;
  DROP TABLE IF EXISTS notes;
  DROP TABLE IF EXISTS applicants;
  DROP TABLE IF EXISTS jobs;
  DROP TABLE IF EXISTS organizations;

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
    screening_matched TEXT,
    screening_missing TEXT,
    screening_exp_years INTEGER
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT DEFAULT 'HR Admin',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    user TEXT DEFAULT 'HR Admin',
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_knockouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    question TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inbox_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
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
`)

console.log('Database initialized successfully')
