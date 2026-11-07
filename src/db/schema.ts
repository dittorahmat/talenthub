import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const organizations = sqliteTable('organizations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: text('created_at').notNull(),
})

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  location: text('location').notNull(),
  remote: text('remote').default('No'),
  postedAt: text('posted_at').notNull(),
})

export const applicants = sqliteTable('applicants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  resumeUrl: text('resume_url'),
  resumePath: text('resume_path'),
  resumeFilename: text('resume_filename'),
  resumeKeywords: text('resume_keywords'),
  source: text('source').default('JobStreet'),
  status: text('status').notNull().default('Applied'),
  jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  screeningStatus: text('screening_status').default('pending'),
  screeningSummary: text('screening_summary'),
  screeningScore: integer('screening_score'),
  screeningBand: text('screening_band'),
  screeningVerdict: text('screening_verdict'),
  screeningMatched: text('screening_matched'),
  screeningMissing: text('screening_missing'),
  screeningExpYears: integer('screening_exp_years'),
})

export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  applicantId: integer('applicant_id').notNull().references(() => applicants.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  author: text('author').default('HR Admin'),
  createdAt: text('created_at').notNull(),
})

export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  applicantId: integer('applicant_id').notNull().references(() => applicants.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  description: text('description').notNull(),
  user: text('user').default('HR Admin'),
  timestamp: text('timestamp').notNull(),
})

export const inboxItems = sqliteTable('inbox_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  fileUrl: text('file_url').notNull(),
  status: text('status').notNull().default('queued'),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  keywords: text('keywords'),
  score: integer('score'),
  band: text('band'),
  verdict: text('verdict'),
  rationale: text('rationale'),
  knockoutResult: text('knockout_result'),
  duplicateOf: integer('duplicate_of'),
  promotedApplicantId: integer('promoted_applicant_id'),
  createdAt: text('created_at').notNull(),
})

export const jobKnockouts = sqliteTable('job_knockouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
})

export const creditWallets = sqliteTable('credit_wallets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').notNull().unique().references(() => organizations.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
})

export const creditTransactions = sqliteTable('credit_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  walletId: integer('wallet_id').notNull().references(() => creditWallets.id, { onDelete: 'cascade' }),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: text('type', {
    enum: [
      'INITIAL_GRANT',
      'TRIAL_GRANT',
      'PURCHASE',
      'CV_SCREENING',
      'RESERVED',
      'SETTLED',
      'REFUND',
      'REFUND_CORRUPTED_FILE',
      'REFUND_PROCESSING_ERROR',
      'SUPERADMIN_ADJUSTMENT',
    ],
  }).notNull(),
  description: text('description'),
  balanceAfter: integer('balance_after').notNull(),
  createdAt: text('created_at').notNull(),
})

export const paymentInvoices = sqliteTable('payment_invoices', {
  id: text('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  packageId: text('package_id').notNull(),
  packageName: text('package_name').notNull(),
  credits: integer('credits').notNull(),
  amountIdr: integer('amount_idr').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentCode: text('payment_code').notNull(), // QRIS string or Virtual Account number
  status: text('status').notNull().default('PENDING'), // PENDING | PAID | EXPIRED | FAILED
  provider: text('provider').default('mock_midtrans'),
  paidAt: text('paid_at'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const trialClaims = sqliteTable('trial_claims', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  corporateDomain: text('corporate_domain').notNull(),
  adminEmail: text('admin_email').notNull(),
  phoneWhatsapp: text('phone_whatsapp').notNull(),
  otpCode: text('otp_code'),
  otpHash: text('otp_hash'),
  otpAttempts: integer('otp_attempts').notNull().default(0),
  otpExpiresAt: text('otp_expires_at'),
  isVerified: integer('is_verified').notNull().default(0),
  claimedAt: text('claimed_at'),
  ipAddress: text('ip_address'),
})

// --- Better Auth Schema Tables ---

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  role: text('role').default('recruiter'), // superadmin | admin | recruiter
  organizationId: integer('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

