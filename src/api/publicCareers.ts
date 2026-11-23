import { Hono } from 'hono'
import { db } from '../db'
import { organizations, jobs, applicants, activities } from '../db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { putDocument, contentTypeForFilename } from '../services/documentStorage'
import { parsePipelineStages } from '../utils/pipelineStages'
import crypto from 'crypto'

export const publicCareersRouter = new Hono()

// 1. Get organization active jobs: GET /api/public/careers/:orgSlug
publicCareersRouter.get('/:orgSlug', async (c) => {
  const orgSlug = c.req.param('orgSlug')
  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, orgSlug))
  const org = orgRows[0]
  if (!org) {
    return c.json({ error: 'Halaman karir perusahaan tidak ditemukan' }, 404)
  }

  const jobRows = await db
    .select()
    .from(jobs)
    .where(eq(jobs.organizationId, org.id))
    .orderBy(desc(jobs.id))

  const publicJobs = jobRows.map((j) => {
    const stages = parsePipelineStages(j.pipelineStages)
    return {
      id: j.id,
      title: j.title,
      location: j.location,
      remote: j.remote,
      posted_at: j.postedAt,
      stages_count: stages.length,
    }
  })

  return c.json({
    organization: {
      name: org.name,
      slug: org.slug,
    },
    jobs: publicJobs,
  })
})

// 2. Get specific job details: GET /api/public/careers/:orgSlug/jobs/:jobId
publicCareersRouter.get('/:orgSlug/jobs/:jobId', async (c) => {
  const orgSlug = c.req.param('orgSlug')
  const jobId = Number(c.req.param('jobId'))
  if (isNaN(jobId)) return c.notFound()

  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, orgSlug))
  const org = orgRows[0]
  if (!org) return c.notFound()

  const jobRows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, org.id)))
  const job = jobRows[0]
  if (!job) return c.notFound()

  return c.json({
    organization: {
      name: org.name,
      slug: org.slug,
    },
    job: {
      id: job.id,
      title: job.title,
      location: job.location,
      remote: job.remote,
      posted_at: job.postedAt,
    },
  })
})

// 3. Submit candidate application: POST /api/public/careers/:orgSlug/jobs/:jobId/apply
publicCareersRouter.post('/:orgSlug/jobs/:jobId/apply', async (c) => {
  const orgSlug = c.req.param('orgSlug')
  const jobId = Number(c.req.param('jobId'))
  if (isNaN(jobId)) return c.notFound()

  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, orgSlug))
  const org = orgRows[0]
  if (!org) return c.json({ error: 'Perusahaan tidak ditemukan' }, 404)

  const jobRows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, org.id)))
  const job = jobRows[0]
  if (!job) return c.json({ error: 'Lowongan kerja tidak ditemukan' }, 404)

  const body = await c.req.parseBody().catch(() => ({}))
  const name = typeof body['name'] === 'string' ? body['name'].trim() : ''
  const email = typeof body['email'] === 'string' ? body['email'].trim() : ''
  const phone = typeof body['phone'] === 'string' ? body['phone'].trim() : ''
  const file = body['file'] as File | undefined

  if (!name || !email) {
    return c.json({ error: 'Nama lengkap dan email wajib diisi' }, 400)
  }

  if (!email.includes('@') || !email.includes('.')) {
    return c.json({ error: 'Format email tidak valid' }, 400)
  }

  let resumePath: string | null = null
  let resumeFilename: string | null = null
  let resumeUrl: string | null = null
  let fileBuffer: Buffer | null = null

  if (file && typeof file.name === 'string') {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      return c.json({ error: 'Hanya format PDF, DOCX, atau TXT yang didukung' }, 400)
    }

    const fileBytes = await file.arrayBuffer()
    fileBuffer = Buffer.from(fileBytes)
    const uint8 = new Uint8Array(fileBytes)
    const randomHex = crypto.randomBytes(8).toString('hex')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `orgs/${org.id}/jobs/${jobId}/public-${randomHex}-${safeName}`
    const contentType = contentTypeForFilename(file.name)

    await putDocument(key, uint8, contentType)

    resumePath = key
    resumeFilename = file.name
    resumeUrl = `/api/applicants/public/resume/${key}`
  }

  // Determine initial stage using canonical parser
  const stages = parsePipelineStages(job.pipelineStages)
  const initialStage = stages[0]?.name || 'Applied'

  const now = new Date().toISOString()
  const insertedApplicant = await db
    .insert(applicants)
    .values({
      organizationId: org.id,
      jobId: job.id,
      name,
      email,
      phone: phone || null,
      source: 'Portal Karir Publik',
      status: initialStage,
      resumePath,
      resumeFilename,
      resumeUrl,
      screeningStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  const applicant = insertedApplicant[0]

  // Credit Protection & Auto-Screening trigger if enabled on job (Ticket 05)
  if (job.autoScreenPublic && resumePath && fileBuffer) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const cap = job.dailyPublicScreeningCap || 20

      // Count screened applicants today for this job
      const screenedTodayCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(applicants)
        .where(
          and(
            eq(applicants.jobId, job.id),
            eq(applicants.organizationId, org.id),
            eq(applicants.screeningStatus, 'ready'),
            sql`date(${applicants.updatedAt}) = date(${today})`
          )
        )
      const count = Number(screenedTodayCount[0]?.count || 0)

      if (count < cap) {
        const { getWallet } = await import('../services/walletService')
        const wallet = await getWallet(org.id)
        if (wallet.balance >= 1) {
          const { candidateIntakeService } = await import('../services/candidateIntakeService')
          await candidateIntakeService.submitSingleResume({
            orgId: org.id,
            jobId: job.id,
            applicantId: applicant.id,
            file: {
              filename: file.name,
              buffer: fileBuffer,
            },
          })
        }
      }
    } catch (autoErr) {
      console.warn('Auto-screen public applicant error, left in pending state:', autoErr)
    }
  }

  // Log activity
  await db.insert(activities).values({
    organizationId: org.id,
    applicantId: applicant.id,
    type: 'PUBLIC_APPLY',
    description: `Pelamar mendaftar mandiri via Portal Karir Publik untuk posisi ${job.title}`,
    user: 'Sistem Publik',
    timestamp: now,
  })

  return c.json(
    {
      success: true,
      message: 'Lamaran Anda telah berhasil dikirimkan!',
      applicantId: applicant.id,
      appliedAt: now,
    },
    201
  )
})
