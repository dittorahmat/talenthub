import { Hono } from 'hono'
import { db } from '../db'
import { applicants, jobs, inboxItems, jobKnockouts, activities } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { mockScreening, KEYWORD_POOL, hashInt, verdictFor, rationaleFor } from './screening'
import { OrgEnv, requireTenant } from '../middleware/orgContext'
import { BatchQueueService, BatchItemInput } from '../services/batchQueueService'
import { getDocument } from '../services/documentStorage'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_BATCH_FILES = 50
const MAX_BATCH_BYTES = 25 * 1024 * 1024
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

/**
 * Streams the request body into memory only up to `maxBytes`. The read is
 * cancelled the moment the cap is crossed, so an oversized upload never gets
 * fully buffered even when no `content-length` header is present.
 */
async function readBodyWithLimit(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<ArrayBuffer | null> {
  if (!body) return new ArrayBuffer(0)

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }

  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged.buffer
}

function mapInboxRow(r: any) {
  return {
    id: r.id,
    job_id: r.jobId,
    filename: r.filename,
    file_path: r.filePath,
    file_url: r.filePath ? `/api/inbox/${r.id}/resume` : null,
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
  const { orgId } = requireTenant(c)
  const jobId = parseInt(c.req.param('id'))
  if (isNaN(jobId)) return c.json({ error: 'Job not found' }, 404)
  const job = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.organizationId, orgId))).get()
  if (!job) return c.json({ error: 'Job not found' }, 404)

  const includeDismissed = c.req.query('include') === 'dismissed'
  let items = await db.select().from(inboxItems).where(and(eq(inboxItems.organizationId, orgId), eq(inboxItems.jobId, jobId))).all()
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

inboxRouter.get('/jobs/:id/inbox/status', async (c) => {
  const { orgId } = requireTenant(c)
  const jobId = parseInt(c.req.param('id'))
  if (isNaN(jobId)) return c.json({ error: 'Job not found' }, 404)
  const job = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.organizationId, orgId))).get()
  if (!job) return c.json({ error: 'Job not found' }, 404)

  const status = await BatchQueueService.getJobBatchStatus(jobId)
  return c.json(status)
})

inboxRouter.post('/jobs/:id/inbox/cancel', async (c) => {
  const { orgId } = requireTenant(c)
  const jobId = parseInt(c.req.param('id'))
  if (isNaN(jobId)) return c.json({ error: 'Job not found' }, 404)
  const job = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.organizationId, orgId))).get()
  if (!job) return c.json({ error: 'Job not found' }, 404)

  const result = await BatchQueueService.cancelQueuedBatch(orgId, jobId)
  return c.json({
    message: `${result.cancelledCount} antrean berhasil dibatalkan.`,
    refundedCredits: result.refundedCredits,
  })
})

inboxRouter.get('/jobs/:id/inbox/preflight', async (c) => {
  const { orgId } = requireTenant(c)
  const jobId = parseInt(c.req.param('id'))
  if (isNaN(jobId)) return c.json({ error: 'Job not found' }, 404)
  const count = parseInt(c.req.query('count') || '1')

  const preflight = await BatchQueueService.checkPreFlightBalance(orgId, Math.max(1, count))
  return c.json(preflight)
})

inboxRouter.get('/inbox/:itemId/resume', async (c) => {
  const { orgId } = requireTenant(c)
  const itemId = parseInt(c.req.param('itemId'))
  if (isNaN(itemId)) return c.notFound()

  const item = await db
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.id, itemId), eq(inboxItems.organizationId, orgId)))
    .get()
  if (!item || !item.filePath) return c.notFound()

  const document = await getDocument(item.filePath)
  if (!document) return c.notFound()

  const filename = item.filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'document'
  return new Response(document.data, {
    headers: {
      'Content-Type': document.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})

inboxRouter.post('/jobs/:id/inbox', async (c) => {
  const { orgId } = requireTenant(c)
  const jobId = parseInt(c.req.param('id'))
  if (isNaN(jobId)) return c.json({ error: 'Job not found' }, 404)
  const job = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.organizationId, orgId))).get()
  if (!job) return c.json({ error: 'Job not found' }, 404)

  // Reject an oversized body before it is buffered into memory. The platform
  // may enforce its own cap upstream, but the application must not depend on it.
  const declaredLength = Number(c.req.header('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BATCH_BYTES) {
    return c.json({
      error: 'PAYLOAD_TOO_LARGE',
      message: `Ukuran unggahan melebihi batas ${Math.round(MAX_BATCH_BYTES / (1024 * 1024))} MB per permintaan.`,
    }, 413)
  }

  let formData: FormData
  try {
    const rawBody = await readBodyWithLimit(c.req.raw.body, MAX_BATCH_BYTES)
    if (rawBody === null) {
      return c.json({
        error: 'PAYLOAD_TOO_LARGE',
        message: `Ukuran unggahan melebihi batas ${Math.round(MAX_BATCH_BYTES / (1024 * 1024))} MB per permintaan.`,
      }, 413)
    }
    const contentType = c.req.header('content-type') ?? ''
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return c.json({ error: 'Invalid form data' }, 400)
    }
    formData = await new Response(rawBody, { headers: { 'content-type': contentType } }).formData()
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

  // Count is checked before any file body is read into a buffer.
  if (files.length > MAX_BATCH_FILES) {
    return c.json({
      error: 'TOO_MANY_FILES',
      message: `Maksimal ${MAX_BATCH_FILES} berkas per unggahan. Permintaan ini berisi ${files.length} berkas.`,
    }, 413)
  }

  // Pre-flight check balance for batch
  const preflight = await BatchQueueService.checkPreFlightBalance(orgId, files.length)
  if (!preflight.allowed) {
    return c.json({
      error: 'INSUFFICIENT_CREDIT',
      message: `Saldo kredit tidak mencukupi untuk memproses ${files.length} berkas CV. Dibutuhkan ${preflight.required} kredit, saldo Anda ${preflight.current} kredit.`,
      required: preflight.required,
      current: preflight.current,
      shortage: preflight.shortage,
    }, 402)
  }

  // Convert files to buffer items for BatchQueueService
  const batchInputs: BatchItemInput[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!(ALLOWED_EXTS as readonly string[]).includes(ext as any)) continue
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    if (buffer.length > MAX_BYTES) continue
    batchInputs.push({
      filename: file.name,
      buffer,
    })
  }

  if (batchInputs.length === 0) {
    return c.json({ error: 'No valid files provided' }, 400)
  }

  const batchResult = await BatchQueueService.enqueueBatch({
    orgId,
    jobId,
    files: batchInputs,
    autoProcessAsync: true,
  })

  // Also query fresh inbox items so caller receives immediate list
  const freshItems = await db
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.organizationId, orgId), eq(inboxItems.jobId, jobId)))
    .all()

  return c.json({
    message: `Batch ${batchResult.queuedCount} berkas CV berhasil masuk antrean.`,
    batchId: batchResult.batchId,
    reservedCredits: batchResult.reservedCredits,
    items: freshItems.map(mapInboxRow),
  }, 201)
})

inboxRouter.post('/inbox/:itemId/promote', async (c) => {
  const { orgId } = requireTenant(c)
  const itemId = parseInt(c.req.param('itemId'))
  if (isNaN(itemId)) return c.json({ error: 'Inbox item not found' }, 404)
  const item = await db
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.id, itemId), eq(inboxItems.organizationId, orgId)))
    .get() as any
  if (!item) return c.json({ error: 'Inbox item not found' }, 404)

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
    resumeUrl: '',
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

  await db
    .update(applicants)
    .set({ resumeUrl: `/api/applicants/${inserted.id}/resume` })
    .where(eq(applicants.id, inserted.id))

  await db.insert(activities).values({
    organizationId: orgId,
    applicantId: inserted.id,
    type: 'status_change',
    description: `Kandidat dipromosikan dari inbox: ${inserted.name}`,
    user: 'HR Admin',
    timestamp: now,
  }).run()

  await db.update(inboxItems).set({ status: 'promoted', promotedApplicantId: inserted.id }).where(and(eq(inboxItems.id, itemId), eq(inboxItems.organizationId, orgId))).run()

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
  const { orgId } = requireTenant(c)
  const itemId = parseInt(c.req.param('itemId'))
  if (isNaN(itemId)) return c.json({ error: 'Inbox item not found' }, 404)
  const item = await db
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.id, itemId), eq(inboxItems.organizationId, orgId)))
    .get() as any
  if (!item) return c.json({ error: 'Inbox item not found' }, 404)

  await db.update(inboxItems).set({ status: 'dismissed' }).where(and(eq(inboxItems.id, itemId), eq(inboxItems.organizationId, orgId))).run()
  return c.json({ success: true, id: itemId })
})
