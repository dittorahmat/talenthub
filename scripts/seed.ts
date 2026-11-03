import { db, sqlite } from '../src/db'
import { organizations, jobs, applicants, notes, activities, inboxItems, jobKnockouts, creditWallets, creditTransactions } from '../src/db/schema'
import { mockScreening } from '../src/api/screening'
import { eq } from 'drizzle-orm'

sqlite.exec('DELETE FROM credit_transactions;')
sqlite.exec('DELETE FROM credit_wallets;')
sqlite.exec('DELETE FROM inbox_items;')
sqlite.exec('DELETE FROM job_knockouts;')
sqlite.exec('DELETE FROM activities;')
sqlite.exec('DELETE FROM notes;')
sqlite.exec('DELETE FROM applicants;')
sqlite.exec('DELETE FROM jobs;')
sqlite.exec('DELETE FROM organizations;')
sqlite.exec('DELETE FROM sqlite_sequence;')

const now = new Date().toISOString()

// 1. Seed organizations
const insertedOrgs = db.insert(organizations).values([
  {
    name: 'Tech Satu Solusi',
    slug: 'tech-satu-solusi',
    createdAt: now,
  },
  {
    name: 'PT Sirius Global Technologies',
    slug: 'sirius-global',
    createdAt: now,
  }
]).returning().all()

const org1 = insertedOrgs[0]
const org2 = insertedOrgs[1]
const defaultOrgId = org1.id // id 1 ("tech-satu-solusi")

// Seed Wallets & Transactions
const wallet1 = db.insert(creditWallets).values({
  organizationId: org1.id,
  balance: 50,
  updatedAt: now,
}).returning().get()

db.insert(creditTransactions).values({
  walletId: wallet1.id,
  organizationId: org1.id,
  amount: 50,
  type: 'INITIAL_GRANT',
  description: 'Initial free tier credits for Tech Satu Solusi',
  balanceAfter: 50,
  createdAt: now,
}).run()

const wallet2 = db.insert(creditWallets).values({
  organizationId: org2.id,
  balance: 20,
  updatedAt: now,
}).returning().get()

db.insert(creditTransactions).values({
  walletId: wallet2.id,
  organizationId: org2.id,
  amount: 20,
  type: 'INITIAL_GRANT',
  description: 'Initial grant for PT Sirius Global Technologies',
  balanceAfter: 20,
  createdAt: now,
}).run()

const jobsData = [
  { organizationId: defaultOrgId, title: 'Senior Frontend Engineer', location: 'Jakarta, Indonesia', remote: 'Yes', postedAt: '2026-09-05' },
  { organizationId: defaultOrgId, title: 'Product Designer', location: 'Bandung, Indonesia', remote: 'No', postedAt: '2026-08-29' },
  { organizationId: defaultOrgId, title: 'DevOps Engineer', location: 'Surabaya, Indonesia', remote: 'Hybrid', postedAt: '2026-08-22' },
]

const insertedJobs = db.insert(jobs).values(jobsData).returning().all()
const job1 = insertedJobs[0].id
const job2 = insertedJobs[1].id
const job3 = insertedJobs[2].id

const applicantsData = [
  // Job 1
  { organizationId: defaultOrgId, jobId: job1, name: 'Andi Putra', email: 'andi.putra@email.com', phone: '+62 812-3456-7890', source: 'JobStreet', status: 'Applied' },
  { organizationId: defaultOrgId, jobId: job1, name: 'Dewi Lestari', email: 'dewi.lestari@email.com', phone: '+62 813-4567-8901', source: 'Kalibrr', status: 'Phone Screen' },
  { organizationId: defaultOrgId, jobId: job1, name: 'Budi Santoso', email: 'budi.santoso@email.com', phone: '+62 814-5678-9012', source: 'JobStreet', status: 'Technical' },
  { organizationId: defaultOrgId, jobId: job1, name: 'Siti Rahayu', email: 'siti.rahyu@email.com', phone: '+62 815-6789-0123', source: 'Indeed Indonesia', status: 'Final Interview' },
  { organizationId: defaultOrgId, jobId: job1, name: 'Raka Wijaya', email: 'raka.wijaya@email.com', phone: '+62 816-7890-1234', source: 'LinkedIn', status: 'Offer' },
  { organizationId: defaultOrgId, jobId: job1, name: 'Andi Kusuma', email: 'andi.kusuma@email.com', phone: '+62 817-8901-2345', source: 'Referral', status: 'Hired' },
  // Job 2
  { organizationId: defaultOrgId, jobId: job2, name: 'Dewi Putri', email: 'dewi.putri@email.com', phone: '+62 819-0123-4567', source: 'JobStreet', status: 'Applied' },
  { organizationId: defaultOrgId, jobId: job2, name: 'Andi Pura', email: 'andi.pura@email.com', phone: '+62 818-9012-3456', source: 'LinkedIn', status: 'Applied' },
  { organizationId: defaultOrgId, jobId: job2, name: 'Raka Pratama', email: 'raka.pratama@email.com', phone: '+62 820-1234-5678', source: 'JobStreet', status: 'Phone Screen' },
  { organizationId: defaultOrgId, jobId: job2, name: 'Siti Lestari', email: 'siti.lestari@email.com', phone: '+62 821-2345-6789', source: 'JobStreet', status: 'Technical' },
  { organizationId: defaultOrgId, jobId: job2, name: 'Budi Kuncoro', email: 'budi.kuncoro@email.com', phone: '+62 822-3456-7890', source: 'Indeed Indonesia', status: 'Final Interview' },
  { organizationId: defaultOrgId, jobId: job2, name: 'Dewi Anggraini', email: 'dewi.anggraini@email.com', phone: '+62 823-4567-8901', source: 'JobStreet', status: 'Offer' },
  { organizationId: defaultOrgId, jobId: job2, name: 'Fajar Nugraha', email: 'fajar.nugraha@email.com', phone: '+62 824-5678-9012', source: 'Kalibrr', status: 'Hired' },
  // Job 3
  { organizationId: defaultOrgId, jobId: job3, name: 'Andi Pratama', email: 'andi.pratama@email.com', phone: '+62 812-3456-7890', source: 'JobStreet', status: 'Applied' },
  { organizationId: defaultOrgId, jobId: job3, name: 'Dewi Wulandari', email: 'dewi.wulandari@email.com', phone: '+62 813-4567-8901', source: 'Kalibrr', status: 'Phone Screen' },
  { organizationId: defaultOrgId, jobId: job3, name: 'Budi Ardi', email: 'budi.ardi@email.com', phone: '+62 814-5678-9012', source: 'JobStreet', status: 'Technical' },
  { organizationId: defaultOrgId, jobId: job3, name: 'Dewi Yanti', email: 'dewi.yanti@email.com', phone: '+62 815-6789-0123', source: 'JobStreet', status: 'Final Interview' },
  { organizationId: defaultOrgId, jobId: job3, name: 'Raka Dwi', email: 'raka.dwi@email.com', phone: '+62 816-7890-1234', source: 'JobStreet', status: 'Offer' },
  { organizationId: defaultOrgId, jobId: job3, name: 'Andi Setia', email: 'andi.setia@email.com', phone: '+62 817-8901-2345', source: 'JobStreet', status: 'Hired' },
  { organizationId: defaultOrgId, jobId: job3, name: 'Budi Setiawan', email: 'budi.setiawan@email.com', phone: '+62 819-0123-4567', source: 'JobStreet', status: 'Applied' },
  { organizationId: defaultOrgId, jobId: job3, name: 'Siti Handayani', email: 'siti.handayani@email.com', phone: '+62 825-6789-0123', source: 'LinkedIn', status: 'Phone Screen' },
]

const insertedApplicants = applicantsData.map(a => {
  return db.insert(applicants).values({
    ...a,
    createdAt: now,
    updatedAt: now
  }).returning().get()
})

const jobTitleById = new Map<number, string>()
for (const j of insertedJobs) jobTitleById.set(j.id, j.title)

for (const app of insertedApplicants) {
  const jobTitle = jobTitleById.get(app.jobId) || 'Senior Frontend Engineer'
  const result = mockScreening({ id: app.id, name: app.name, resumeKeywords: app.resumeKeywords ?? null }, { title: jobTitle })
  db.update(applicants).set({
    screeningStatus: 'ready',
    screeningSummary: result.summary,
    screeningScore: result.score,
    screeningBand: result.band,
    screeningMatched: result.matched.join(', '),
    screeningMissing: result.missing.join(', '),
    screeningExpYears: result.expYears,
  }).where(eq(applicants.id, app.id)).run()
  app.screeningStatus = 'ready' as any
}

for (const app of insertedApplicants) {
  db.insert(notes).values([
    {
      organizationId: defaultOrgId,
      applicantId: app.id,
      text: `Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.`,
      author: 'HR Admin',
      createdAt: now
    },
    {
      organizationId: defaultOrgId,
      applicantId: app.id,
      text: `Kandidat responsif saat dihubungi dan bersedia interview.`,
      author: 'HR Admin',
      createdAt: now
    }
  ]).run()

  db.insert(activities).values([
    {
      organizationId: defaultOrgId,
      applicantId: app.id,
      type: 'status_change',
      description: `Kandidat melamar posisi melalui ${app.source}`,
      user: 'Sistem',
      timestamp: now
    },
    {
      organizationId: defaultOrgId,
      applicantId: app.id,
      type: 'note',
      description: `HR Admin menambahkan catatan review awal`,
      user: 'HR Admin',
      timestamp: now
    }
  ]).run()
}

for (const j of insertedJobs) {
  db.insert(jobKnockouts).values([
    { jobId: j.id, question: 'Apakah Anda bersedia bekerja onsite sesuai lokasi lowongan?' },
    { jobId: j.id, question: 'Apakah Anda memiliki minimal 2 tahun pengalaman relevan?' },
  ]).run()
}
const knockoutCount = insertedJobs.length * 2

console.log('Seeded successfully:', {
  organizations: insertedOrgs.length,
  jobs: insertedJobs.length,
  applicants: insertedApplicants.length,
  knockouts: knockoutCount
})
