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
