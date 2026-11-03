import { Hono } from 'hono'
import { db } from '../db'
import { applicants, jobs, inboxItems, jobKnockouts, activities } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { promises as fs } from 'fs'
import path from 'path'
import { mockScreening, KEYWORD_POOL, hashInt, verdictFor, rationaleFor } from './screening'
import { OrgEnv } from '../middleware/orgContext'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'txt'] as const

export const inboxRouter = new Hono<OrgEnv>()

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  return KEYWORD_POOL.filter((kw) => lower.includes(kw.toLowerCase()))
}

function sanitizeName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '')
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim()
  if (!cleaned) return 'Kandidat'
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function mapInboxRow(r: any) {
  return {
    id: r.id,
    job_id: r.jobId,
    filename: r.filename,
    file_path: r.filePath,
    file_url: r.fileUrl,
    status: r.status,
    name: r.name,
    email: r.email,
    phone: r.phone,
    keywords: r.keywords,
    score: r.score,
    band: r.band,
    verdict: r.verdict,
    rationale: r.rationale,
    knockout_result: r.knockoutResult,
    duplicate_of: r.duplicateOf,
    promoted_applicant_id: r.promotedApplicantId,
    created_at: r.createdAt,
  }
}

inboxRouter.get('/jobs/:id/inbox', async (c) => {
  const orgId = c.get('orgId') || 1
  const jobId = parseInt(c.req.param('id'))
  if (isNaN(jobId)) return c.json({ error: 'Job not found' }, 404)
  const job = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.organizationId, orgId))).get()
  if (!job) return c.json({ error: 'Job not found' }, 404)

  const includeDismissed = c.req.query('include') === 'dismissed'
  let items = await db.select().from(inboxItems).where(eq(inboxItems.jobId, jobId)).all()
  if (!includeDismissed) {
    items = items.filter((i) => (i as any).status !== 'dismissed')
  }
  items.sort((a, b) => (a as any).id - (b as any).id)
  const knockouts = await db.select().from(jobKnockouts).where(eq(jobKnockouts.jobId, jobId)).all()
  return c.json({
    items: items.map(mapInboxRow),
    knockouts: knockouts.map((k: any) => ({ id: k.id, job_id: k.jobId, question: k.question })),
  })
})

inboxRouter.post('/jobs/:id/inbox', async (c) => {
  const orgId = c.get('orgId') || 1
  const jobId = parseInt(c.req.param('id'))
  if (isNaN(jobId)) return c.json({ error: 'Job not found' }, 404)
  const job = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.organizationId, orgId))).get()
  if (!job) return c.json({ error: 'Job not found' }, 404)

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Invalid form data' }, 400)
  }

  const files: File[] = []
  for (const [, v] of (formData as any).entries()) {
    if (v instanceof File && v.name) files.push(v)
  }
  if (files.length === 0) {
    for (const key of ['files[]', 'files', 'file']) {
      const vals = formData.getAll(key)
      for (const v of vals) if (v instanceof File && v.name) files.push(v)
    }
  }

  if (files.length === 0) return c.json({ error: 'No files provided' }, 400)

  const created: any[] = []

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!(ALLOWED_EXTS as readonly string[]).includes(ext as any)) {
      continue
    }
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    if (buffer.length > MAX_BYTES) {
      continue
    }

    let extractedText = ''
    try {
      extractedText = buffer.toString('utf-8')
    } catch {
      extractedText = ''
    }

    const emailMatch = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const phoneMatch = extractedText.match(/(?:\+62|62|08)[0-9\s-]{8,14}/)
    const extractedEmail = emailMatch ? emailMatch[0] : null
    const extractedPhone = phoneMatch ? phoneMatch[0].trim() : null
    const sanitizedName = sanitizeName(file.name)

    let isDuplicate = false
    let duplicateOf: number | null = null

    if (extractedEmail) {
      const normalizedEmail = extractedEmail.toLowerCase()
      const allApps = await db.select().from(applicants).where(and(eq(applicants.jobId, jobId), eq(applicants.organizationId, orgId))).all()
      const found = allApps.find((a: any) => a.email && a.email.toLowerCase() === normalizedEmail)
      if (found) {
        isDuplicate = true
        duplicateOf = (found as any).id
      }
    }
    if (!isDuplicate && extractedPhone) {
      const normalizedPhone = extractedPhone.replace(/\s|-/g, '')
      const allApps2 = await db.select().from(applicants).where(and(eq(applicants.jobId, jobId), eq(applicants.organizationId, orgId))).all()
      const foundPhone = allApps2.find((a: any) => a.phone && a.phone.replace(/\s|-/g, '') === normalizedPhone)
      if (foundPhone) { isDuplicate = true; duplicateOf = (foundPhone as any).id }
    }
    if (!isDuplicate) {
      const existingInbox = await db.select().from(inboxItems).where(eq(inboxItems.jobId, jobId)).all()
      const dupInbox = existingInbox.find((i: any) => i.filename === file.name)
      if (dupInbox) { isDuplicate = true; duplicateOf = (dupInbox as any).id }
    }
    if (!isDuplicate) {
      const allApps3 = await db.select().from(applicants).where(and(eq(applicants.jobId, jobId), eq(applicants.organizationId, orgId))).all()
      const foundFilename = allApps3.find((a: any) => a.resumeFilename === file.name)
      if (foundFilename) { isDuplicate = true; duplicateOf = (foundFilename as any).id }
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'inbox')
    await fs.mkdir(uploadDir, { recursive: true })
    const storedFilename = `${jobId}-${Date.now()}-${Math.abs(hashInt(buffer.length + file.name.length))}.${ext}`
    const filePath = path.join(uploadDir, storedFilename)
    await fs.writeFile(filePath, buffer)
    const fileUrl = `/uploads/inbox/${storedFilename}`

    const keywordsArr = extractKeywords(extractedText)
    const keywordsStr = keywordsArr.join(', ') || null

    if (isDuplicate) {
      const now = new Date().toISOString()
      const inserted = await db.insert(inboxItems).values({
        jobId,
        filename: file.name,
        filePath,
        fileUrl,
        status: 'ready',
        name: sanitizedName,
        email: extractedEmail,
        phone: extractedPhone,
        keywords: keywordsStr,
        score: null,
        band: 'Weak',
        verdict: 'Pass',
        rationale: `${sanitizedName} sudah melamar pada lowongan ini.`,
        knockoutResult: null,
        duplicateOf,
        promotedApplicantId: null,
        createdAt: now,
      }).returning().get()
      created.push(mapInboxRow(inserted))
      continue
    }

    const now = new Date().toISOString()
    const inserted = await db.insert(inboxItems).values({
      jobId,
      filename: file.name,
      filePath,
      fileUrl,
      status: 'queued',
      name: sanitizedName,
      email: extractedEmail,
      phone: extractedPhone,
      keywords: keywordsStr,
      score: null,
      band: null,
      verdict: null,
      rationale: null,
      knockoutResult: null,
      duplicateOf: null,
      promotedApplicantId: null,
      createdAt: now,
    }).returning().get()

    const itemId = (inserted as any).id

    setTimeout(async () => {
      try {
        await db.update(inboxItems).set({ status: 'parsing' }).where(eq(inboxItems.id, itemId)).run()
      } catch {}
      const hashDelay = 2000 + (Math.abs(hashInt(itemId * 1337 + buffer.length)) % 2001)
      setTimeout(async () => {
        try {
          const fresh = await db.select().from(inboxItems).where(eq(inboxItems.id, itemId)).get() as any
          if (!fresh || fresh.status === 'dismissed' || fresh.status === 'promoted') return
          const jobRow = await db.select().from(jobs).where(eq(jobs.id, fresh.jobId)).get() as any
          const jobTitle = jobRow?.title ?? 'Senior Frontend Engineer'
          const kwStr = fresh.keywords ?? ''
          const result = mockScreening({ id: fresh.id, name: fresh.name ?? sanitizedName, resumeKeywords: kwStr }, { title: jobTitle })
          let band = result.band
          let verdict = verdictFor(band)
          const knockouts = await db.select().from(jobKnockouts).where(eq(jobKnockouts.jobId, fresh.jobId)).all() as any[]
          let knockoutFailed: string | null = null
          for (const k of knockouts) {
            const h = Math.abs(hashInt(fresh.id * 1009 + k.id * 97))
            if (h % 3 === 0) { knockoutFailed = k.question; break }
          }
          if (knockoutFailed && verdict === 'Hire') verdict = 'Consider'
          const rationale = rationaleFor({
            name: fresh.name ?? sanitizedName,
            verdict,
            matched: result.matched,
            missing: result.missing,
            knockoutFailed,
          })
          await db.update(inboxItems).set({
            status: 'ready',
            score: result.score,
            band,
            verdict,
            rationale,
            knockoutResult: knockoutFailed,
            keywords: result.matched.join(', ') ? result.matched.join(', ') : kwStr,
          }).where(eq(inboxItems.id, itemId)).run()
        } catch {}
      }, hashDelay)
    }, 1000)

    created.push(mapInboxRow(inserted))
  }

  return c.json({ items: created })
})

inboxRouter.post('/inbox/:itemId/promote', async (c) => {
  const orgId = c.get('orgId') || 1
  const itemId = parseInt(c.req.param('itemId'))
  if (isNaN(itemId)) return c.json({ error: 'Inbox item not found' }, 404)
  const item = await db.select().from(inboxItems).where(eq(inboxItems.id, itemId)).get() as any
  if (!item) return c.json({ error: 'Inbox item not found' }, 404)

  // Verify parent job belongs to this org
  const job = await db.select().from(jobs).where(and(eq(jobs.id, item.jobId), eq(jobs.organizationId, orgId))).get()
  if (!job) return c.json({ error: 'Inbox item not found' }, 404)

  if (item.promotedApplicantId) return c.json({ error: 'Already promoted' }, 409)
  if (item.status === 'promoted') return c.json({ error: 'Already promoted' }, 409)

  let body: any = {}
  try { body = await c.req.json() } catch { body = {} }
  const name = (body.name && String(body.name).trim()) || item.name || sanitizeName(item.filename)
  const email = (body.email && String(body.email).trim().toLowerCase()) || item.email || `inbox-${itemId}@example.com`

  const now = new Date().toISOString()
  const inserted = await db.insert(applicants).values({
    organizationId: orgId,
    jobId: item.jobId,
    name,
    email,
    phone: item.phone ?? '',
    source: 'Inbox',
    status: 'Applied',
    resumePath: item.filePath,
    resumeUrl: item.fileUrl,
    resumeFilename: item.filename,
    resumeKeywords: item.keywords,
    createdAt: now,
    updatedAt: now,
    screeningStatus: item.status === 'ready' ? 'ready' : 'pending',
    screeningSummary: item.rationale,
    screeningScore: item.score,
    screeningBand: item.band,
    screeningMatched: item.keywords,
    screeningMissing: null,
    screeningExpYears: null,
  }).returning().get() as any

  await db.insert(activities).values({
    organizationId: orgId,
    applicantId: inserted.id,
    type: 'status_change',
    description: `Kandidat dipromosikan dari inbox: ${inserted.name}`,
    user: 'HR Admin',
    timestamp: now,
  }).run()

  await db.update(inboxItems).set({ status: 'promoted', promotedApplicantId: inserted.id }).where(eq(inboxItems.id, itemId)).run()

  return c.json({
    success: true,
    applicant: {
      id: inserted.id,
      organization_id: inserted.organizationId,
      job_id: inserted.jobId,
      name: inserted.name,
      email: inserted.email,
      status: inserted.status,
      screening_score: inserted.screeningScore,
      screening_band: inserted.screeningBand,
    },
    inboxItemId: itemId,
  })
})

inboxRouter.post('/inbox/:itemId/dismiss', async (c) => {
  const orgId = c.get('orgId') || 1
  const itemId = parseInt(c.req.param('itemId'))
  if (isNaN(itemId)) return c.json({ error: 'Inbox item not found' }, 404)
  const item = await db.select().from(inboxItems).where(eq(inboxItems.id, itemId)).get() as any
  if (!item) return c.json({ error: 'Inbox item not found' }, 404)

  const job = await db.select().from(jobs).where(and(eq(jobs.id, item.jobId), eq(jobs.organizationId, orgId))).get()
  if (!job) return c.json({ error: 'Inbox item not found' }, 404)

  await db.update(inboxItems).set({ status: 'dismissed' }).where(eq(inboxItems.id, itemId)).run()
  return c.json({ success: true, id: itemId })
})
