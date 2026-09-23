import { db, sqlite } from '../src/db'
import { jobs, applicants, notes, activities, inboxItems, jobKnockouts } from '../src/db/schema'
import { mockScreening } from '../src/api/screening'
import { eq } from 'drizzle-orm'

sqlite.exec('DELETE FROM inbox_items;')
sqlite.exec('DELETE FROM job_knockouts;')
sqlite.exec('DELETE FROM activities;')
sqlite.exec('DELETE FROM notes;')
sqlite.exec('DELETE FROM applicants;')
sqlite.exec('DELETE FROM jobs;')
sqlite.exec('DELETE FROM sqlite_sequence;')

const now = new Date().toISOString()
const jobsData = [
  { title: 'Senior Frontend Engineer', location: 'Jakarta, Indonesia', remote: 'Yes', postedAt: '2026-09-05' },
  { title: 'Product Designer', location: 'Bandung, Indonesia', remote: 'No', postedAt: '2026-08-29' },
  { title: 'DevOps Engineer', location: 'Surabaya, Indonesia', remote: 'Hybrid', postedAt: '2026-08-22' },
]

const insertedJobs = db.insert(jobs).values(jobsData).returning().all()
const job1 = insertedJobs[0].id
const job2 = insertedJobs[1].id
const job3 = insertedJobs[2].id

const applicantsData = [
  // Job 1
  { jobId: job1, name: 'Andi Putra', email: 'andi.putra@email.com', phone: '+62 812-3456-7890', source: 'JobStreet', status: 'Applied' },
  { jobId: job1, name: 'Dewi Lestari', email: 'dewi.lestari@email.com', phone: '+62 813-4567-8901', source: 'Kalibrr', status: 'Phone Screen' },
  { jobId: job1, name: 'Budi Santoso', email: 'budi.santoso@email.com', phone: '+62 814-5678-9012', source: 'JobStreet', status: 'Technical' },
  { jobId: job1, name: 'Siti Rahayu', email: 'siti.rahyu@email.com', phone: '+62 815-6789-0123', source: 'Indeed Indonesia', status: 'Final Interview' },
  { jobId: job1, name: 'Raka Wijaya', email: 'raka.wijaya@email.com', phone: '+62 816-7890-1234', source: 'LinkedIn', status: 'Offer' },
  { jobId: job1, name: 'Andi Kusuma', email: 'andi.kusuma@email.com', phone: '+62 817-8901-2345', source: 'Referral', status: 'Hired' },
  // Job 2
  { jobId: job2, name: 'Dewi Putri', email: 'dewi.putri@email.com', phone: '+62 819-0123-4567', source: 'JobStreet', status: 'Applied' },
  { jobId: job2, name: 'Andi Pura', email: 'andi.pura@email.com', phone: '+62 818-9012-3456', source: 'LinkedIn', status: 'Applied' },
  { jobId: job2, name: 'Raka Pratama', email: 'raka.pratama@email.com', phone: '+62 820-1234-5678', source: 'JobStreet', status: 'Phone Screen' },
  { jobId: job2, name: 'Siti Lestari', email: 'siti.lestari@email.com', phone: '+62 821-2345-6789', source: 'JobStreet', status: 'Technical' },
  { jobId: job2, name: 'Budi Kuncoro', email: 'budi.kuncoro@email.com', phone: '+62 822-3456-7890', source: 'Indeed Indonesia', status: 'Final Interview' },
  { jobId: job2, name: 'Dewi Anggraini', email: 'dewi.anggraini@email.com', phone: '+62 823-4567-8901', source: 'JobStreet', status: 'Offer' },
  { jobId: job2, name: 'Fajar Nugraha', email: 'fajar.nugraha@email.com', phone: '+62 824-5678-9012', source: 'Kalibrr', status: 'Hired' },
  // Job 3
  { jobId: job3, name: 'Andi Pratama', email: 'andi.pratama@email.com', phone: '+62 812-3456-7890', source: 'JobStreet', status: 'Applied' },
  { jobId: job3, name: 'Dewi Wulandari', email: 'dewi.wulandari@email.com', phone: '+62 813-4567-8901', source: 'Kalibrr', status: 'Phone Screen' },
  { jobId: job3, name: 'Budi Ardi', email: 'budi.ardi@email.com', phone: '+62 814-5678-9012', source: 'JobStreet', status: 'Technical' },
  { jobId: job3, name: 'Dewi Yanti', email: 'dewi.yanti@email.com', phone: '+62 815-6789-0123', source: 'JobStreet', status: 'Final Interview' },
  { jobId: job3, name: 'Raka Dwi', email: 'raka.dwi@email.com', phone: '+62 816-7890-1234', source: 'JobStreet', status: 'Offer' },
  { jobId: job3, name: 'Andi Setia', email: 'andi.setia@email.com', phone: '+62 817-8901-2345', source: 'JobStreet', status: 'Hired' },
  { jobId: job3, name: 'Budi Setiawan', email: 'budi.setiawan@email.com', phone: '+62 819-0123-4567', source: 'JobStreet', status: 'Applied' },
  { jobId: job3, name: 'Siti Handayani', email: 'siti.handayani@email.com', phone: '+62 825-6789-0123', source: 'LinkedIn', status: 'Phone Screen' },
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
      applicantId: app.id,
      text: `Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.`,
      author: 'HR Admin',
      createdAt: now
    },
    {
      applicantId: app.id,
      text: `Kandidat responsif saat dihubungi dan bersedia interview.`,
      author: 'HR Admin',
      createdAt: now
    }
  ]).run()

  db.insert(activities).values([
    {
      applicantId: app.id,
      type: 'status_change',
      description: `Kandidat melamar posisi melalui ${app.source}`,
      user: 'Sistem',
      timestamp: now
    },
    {
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

console.log('Seeded successfully:', { jobs: insertedJobs.length, applicants: insertedApplicants.length, knockouts: knockoutCount })
