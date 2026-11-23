import { Hono } from 'hono'
import { db } from '../db'
import { organizations, jobs, applicants, activities } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { putDocument, contentTypeForFilename } from '../services/documentStorage'
import crypto from 'crypto'

export const publicCareersRouter = new Hono()

// Rate limit helper: simple IP tracking in memory per minute
const publicIpLimiter = new Map<string, { count: number; resetAt: number }>()

function checkIpRateLimit(ip: string, maxRequests = 20): boolean {
  const now = Date.now()
  const entry = publicIpLimiter.get(ip)
  if (!entry || entry.resetAt < now) {
    publicIpLimiter.set(ip, { count: 1, resetAt: now + 60 * 1000 })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

// 1. Get organization active jobs: GET /api/public/careers/:orgSlug
publicCareersRouter.get('/:orgSlug', async (c) => {
  const orgSlug = c.req.param('orgSlug')
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1'

  if (!checkIpRateLimit(clientIp, 60)) {
    return c.json({ error: 'Terlalu banyak permintaan. Silakan coba kembali sesaat lagi.' }, 429)
  }

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
    let stages = null
    if (j.pipelineStages) {
      try {
        stages = JSON.parse(j.pipelineStages)
      } catch {}
    }
    return {
      id: j.id,
      title: j.title,
      location: j.location,
      remote: j.remote,
      posted_at: j.postedAt,
      stages_count: stages ? stages.length : 5,
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

  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1'
  if (!checkIpRateLimit(clientIp, 15)) {
    return c.json({ error: 'Terlalu banyak pengiriman lamaran dari jaringan Anda. Mohon tunggu sejenak.' }, 429)
  }

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

  if (file && typeof file.name === 'string') {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      return c.json({ error: 'Hanya format PDF, DOCX, atau TXT yang didukung' }, 400)
    }

    const fileBytes = await file.arrayBuffer()
    const uint8 = new Uint8Array(fileBytes)
    const randomHex = crypto.randomBytes(8).toString('hex')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `orgs/${org.id}/jobs/${jobId}/public-${randomHex}-${safeName}`
    const contentType = contentTypeForFilename(file.name)

    await putDocument(key, uint8, contentType)

    resumePath = key
    resumeFilename = file.name
    resumeUrl = `/api/applicants/public/file/${key}`
  }

  // Determine initial stage
  let initialStage = 'Applied'
  if (job.pipelineStages) {
    try {
      const parsed = JSON.parse(job.pipelineStages)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
        initialStage = parsed[0].name
      }
    } catch {}
  }

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

  // Optional: Auto-Screening trigger if enabled on job & balance available (Ticket 05)
  if (job.autoScreenPublic && resumePath && file) {
    try {
      const { getWallet } = await import('../services/walletService')
      const wallet = await getWallet(org.id)
      if (wallet.balance >= 1) {
        const { candidateIntakeService } = await import('../services/candidateIntakeService')
        const fileBytes = await file.arrayBuffer()
        const buffer = Buffer.from(fileBytes)
        await candidateIntakeService.submitSingleResume({
          orgId: org.id,
          jobId: job.id,
          applicantId: applicant.id,
          file: {
            filename: file.name,
            buffer,
          },
        })
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
