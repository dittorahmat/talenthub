import { db } from '../db'
import { inboxItems, jobs, jobKnockouts, applicants } from '../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { reserveCredit, commitCredit, refundCredit, getWallet } from './walletService'
import { evaluateResume, isCorruptedOrUnreadableBuffer } from './aiScreeningService'
import { mockScreening, hashInt, verdictFor, rationaleFor, KEYWORD_POOL } from '../api/screening'
import { contentTypeForFilename, deleteDocuments, putDocument } from './documentStorage'

export interface BatchItemInput {
  filename: string
  buffer: Buffer
}

export interface BatchProgressItem {
  id: number
  filename: string
  status: 'QUEUED' | 'EXTRACTING' | 'EVALUATING' | 'READY' | 'FAILED'
  score: number | null
  verdict: string | null
  applicantName: string | null
  error?: string | null
}

export interface BatchStatusResult {
  jobId: number
  total: number
  processed: number
  completed: number
  failed: number
  items: BatchProgressItem[]
}

export interface EnqueueBatchOptions {
  orgId: number
  jobId: number
  files: BatchItemInput[]
  autoProcessAsync?: boolean
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

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  return KEYWORD_POOL.filter((kw) => lower.includes(kw.toLowerCase()))
}

// In-memory active batch status tracking (simulates Cloudflare Queues state and worker dispatcher)
const jobBatchState = new Map<number, {
  jobId: number
  items: Map<number, BatchProgressItem>
}>()

// One in-flight batch per tenant keeps a single tenant from saturating the
// worker with unbounded parallel screening work.
const activeBatchOrganizations = new Set<number>()

export class BatchQueueService {
  /**
   * Check pre-flight credit balance for an organization before accepting a batch
   */
  static async checkPreFlightBalance(orgId: number, fileCount: number): Promise<{
    allowed: boolean
    required: number
    current: number
    shortage: number
  }> {
    const wallet = await getWallet(orgId)
    const current = wallet.balance
    const required = fileCount
    const shortage = Math.max(0, required - current)
    return {
      allowed: current >= required,
      required,
      current,
      shortage,
    }
  }

  /**
   * Enqueue a batch of CV files to a job inbox with atomic reservation
   */
  static async enqueueBatch(options: EnqueueBatchOptions): Promise<{
    success: boolean
    batchId: string
    queuedCount: number
    reservedCredits: number
    items: BatchProgressItem[]
  }> {
    const { orgId, jobId, files, autoProcessAsync = true } = options

    if (files.length === 0) {
      throw new Error('No files provided in batch')
    }

    if (activeBatchOrganizations.has(orgId)) {
      const busy: any = new Error('A batch is already being processed for this organization')
      busy.code = 'BATCH_IN_PROGRESS'
      throw busy
    }

    // 1. Pre-flight check
    const preflight = await this.checkPreFlightBalance(orgId, files.length)
    if (!preflight.allowed) {
      const err: any = new Error('Insufficient credit balance for batch')
      err.code = 'INSUFFICIENT_CREDIT'
      err.required = preflight.required
      err.current = preflight.current
      err.shortage = preflight.shortage
      throw err
    }

    // 2. Atomic credit reservation for all files in the batch
    await reserveCredit(
      orgId,
      files.length,
      `Reserve ${files.length} credits for batch CV upload (Job #${jobId})`
    )

    activeBatchOrganizations.add(orgId)

    const queuedItems: BatchProgressItem[] = []
    const queuedRecords: { id: number; buffer: Buffer; filename: string }[] = []

    for (const file of files) {
      const ext = file.filename.split('.').pop()?.toLowerCase() || 'txt'
      const sanitizedCandidateName = sanitizeName(file.filename)
      const storageKey = `orgs/${orgId}/jobs/${jobId}/inbox/${randomUUID()}.${ext}`
      await putDocument(storageKey, file.buffer, contentTypeForFilename(file.filename))

      let extractedText = ''
      try {
        extractedText = file.buffer.toString('utf-8')
      } catch {
        extractedText = ''
      }

      // Bounded scan: resume text can be megabytes, and an unbounded email
      // pattern backtracks catastrophically on long runs of word characters.
      const sample = extractedText.slice(0, 200_000)
      const emailMatch = sample.match(/[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,24}/)
      const phoneMatch = sample.match(/(?:\+62|62|08)[0-9\s-]{8,14}/)
      const extractedEmail = emailMatch ? emailMatch[0] : null
      const extractedPhone = phoneMatch ? phoneMatch[0].trim() : null
      const keywordsArr = extractKeywords(sample)
      const keywordsStr = keywordsArr.join(', ') || null

      const now = new Date().toISOString()
      const inserted = await db.insert(inboxItems).values({
        organizationId: orgId,
        jobId,
        filename: file.filename,
        filePath: storageKey,
        fileUrl: '',
        status: 'queued',
        name: sanitizedCandidateName,
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
      }).returning().get() as any

      const progressItem: BatchProgressItem = {
        id: inserted.id,
        filename: file.filename,
        status: 'QUEUED',
        score: null,
        verdict: null,
        applicantName: sanitizedCandidateName,
      }

      queuedItems.push(progressItem)
      queuedRecords.push({
        id: inserted.id,
        buffer: file.buffer,
        filename: file.filename,
      })

      // Track in memory
      let jobState = jobBatchState.get(jobId)
      if (!jobState) {
        jobState = { jobId, items: new Map() }
        jobBatchState.set(jobId, jobState)
      }
      jobState.items.set(inserted.id, progressItem)
    }

    // 3. Worker processing
    if (autoProcessAsync) {
      // Background worker asynchronous execution
      setTimeout(() => {
        this.processBatchQueue(orgId, jobId, queuedRecords).catch((err) => {
          console.error(`[BatchWorker] Error processing batch for job ${jobId}:`, err)
        })
      }, 50)
    }

    return {
      success: true,
      batchId: `batch-${jobId}-${Date.now()}`,
      queuedCount: files.length,
      reservedCredits: files.length,
      items: queuedItems,
    }
  }

  /**
   * Worker loop: processes items sequentially or controlled parallelism
   * State transitions: QUEUED -> EXTRACTING -> EVALUATING -> READY / FAILED
   */
  static async processBatchQueue(
    orgId: number,
    jobId: number,
    itemsToProcess: { id: number; buffer: Buffer; filename: string }[]
  ): Promise<void> {
    const jobRow = await db.select().from(jobs).where(eq(jobs.id, jobId)).get() as any
    const jobTitle = jobRow?.title || 'Posisi Pekerjaan'

    try {
      for (const item of itemsToProcess) {
        await this.processSingleQueueItem(orgId, jobId, item.id, item.buffer, item.filename, jobTitle)
      }
    } finally {
      // Release per-batch state as soon as nothing is left in flight, so a
      // long-lived instance does not accumulate progress maps for finished jobs.
      const remaining = await db
        .select()
        .from(inboxItems)
        .where(
          and(
            eq(inboxItems.jobId, jobId),
            inArray(inboxItems.status, ['queued', 'extracting', 'evaluating']),
          ),
        )
        .all()

      if (remaining.length === 0) {
        jobBatchState.delete(jobId)
        activeBatchOrganizations.delete(orgId)
      }
    }
  }

  /**
   * Process a single queued item through state transitions with atomic commit or refund
   */
  static async processSingleQueueItem(
    orgId: number,
    jobId: number,
    itemId: number,
    buffer: Buffer,
    filename: string,
    jobTitle: string
  ): Promise<void> {
    const jobState = jobBatchState.get(jobId)
    const updateMemStatus = (status: BatchProgressItem['status'], score?: number | null, verdict?: string | null, error?: string | null) => {
      const it = jobState?.items.get(itemId)
      if (it) {
        it.status = status
        if (score !== undefined) it.score = score
        if (verdict !== undefined) it.verdict = verdict
        if (error !== undefined) it.error = error
      }
    }

    try {
      // 1. EXTRACTING — claim the item atomically. A cancelled (dismissed) item
      // can no longer be claimed, so cancellation always wins the race.
      const claimed = await db
        .update(inboxItems)
        .set({ status: 'extracting' })
        .where(and(eq(inboxItems.id, itemId), eq(inboxItems.status, 'queued')))
        .returning()
        .all()

      if (claimed.length === 0) {
        return
      }

      updateMemStatus('EXTRACTING')

      // Small delay to simulate worker queue ingestion
      await new Promise((r) => setTimeout(r, 40))

      // Check corrupted or unreadable buffer
      const isCorrupt = isCorruptedOrUnreadableBuffer(buffer, filename)
      if (isCorrupt) {
        // Refund 1 credit for this corrupted item
        await refundCredit(
          orgId,
          1,
          'REFUND_CORRUPTED_FILE',
          `Refund 1 credit: file CV ${filename} rusak atau tidak terbaca (Batch Item #${itemId})`
        )

        updateMemStatus('FAILED', null, 'Failed', 'File CV rusak atau tidak terbaca')
        await db.update(inboxItems).set({
          status: 'error',
          verdict: 'Pass',
          rationale: 'File CV rusak atau tidak terbaca (Kredit dikembalikan)',
        }).where(eq(inboxItems.id, itemId)).run()
        return
      }

      // 2. EVALUATING
      updateMemStatus('EVALUATING')
      await db.update(inboxItems).set({ status: 'evaluating' }).where(eq(inboxItems.id, itemId)).run()

      const itemRow = await db.select().from(inboxItems).where(eq(inboxItems.id, itemId)).get() as any
      const candidateName = itemRow?.name || sanitizeName(filename)

      // AI evaluation
      const evalResult = await evaluateResume({
        resumeBuffer: buffer,
        jobTitle,
        applicantName: candidateName,
      })

      // Knockout check simulation
      const knockouts = await db.select().from(jobKnockouts).where(eq(jobKnockouts.jobId, jobId)).all() as any[]
      let knockoutFailed: string | null = null
      for (const k of knockouts) {
        const h = Math.abs(hashInt(itemId * 1009 + k.id * 97))
        if (h % 3 === 0) {
          knockoutFailed = k.question
          break
        }
      }

      let verdict = evalResult.verdict
      if (knockoutFailed && verdict === 'Hire') {
        verdict = 'Consider'
      }

      // Commit 1 credit
      await commitCredit(
        orgId,
        `batch-inbox-${itemId}`,
        `Screening batch CV ${candidateName} (${filename})`,
      )

      // 3. READY
      updateMemStatus('READY', evalResult.score, verdict)
      await db.update(inboxItems).set({
        status: 'ready',
        score: evalResult.score,
        band: evalResult.band,
        verdict,
        rationale: evalResult.summary,
        knockoutResult: knockoutFailed,
        keywords: evalResult.matchedSkills.join(', '),
      }).where(eq(inboxItems.id, itemId)).run()

    } catch (err: any) {
      console.error(`[BatchWorker] Failed to process inbox item #${itemId}:`, err)
      // Refund on system failure
      await refundCredit(
        orgId,
        1,
        'REFUND_PROCESSING_ERROR',
        `Refund 1 credit: error pemrosesan CV ${filename} (Batch Item #${itemId})`
      ).catch(() => {})

      updateMemStatus('FAILED', null, 'Failed', err?.message || 'Gagal memproses CV')
      await db.update(inboxItems).set({
        status: 'error',
        rationale: `Gagal memproses berkas: ${err?.message || 'Unknown error'}`,
      }).where(eq(inboxItems.id, itemId)).run().catch(() => {})
    }
  }

  /**
   * Cancels remaining queued items for a job inbox and refunds reserved credits.
   */
  static async cancelQueuedBatch(orgId: number, jobId: number): Promise<{
    cancelledCount: number
    refundedCredits: number
  }> {
    const jobState = jobBatchState.get(jobId)

    // Atomically move only still-queued rows to dismissed. Rows already claimed
    // by the worker (extracting/evaluating/ready/error) are never refunded.
    const cancelledItems = await db
      .update(inboxItems)
      .set({
        status: 'dismissed',
        rationale: 'Dibatalkan oleh pengguna (kredit dikembalikan)',
      })
      .where(and(eq(inboxItems.organizationId, orgId), eq(inboxItems.jobId, jobId), eq(inboxItems.status, 'queued')))
      .returning()
      .all() as any[]

    let cancelledCount = 0
    const cancelledKeys: Array<string | null> = []
    for (const item of cancelledItems) {
      cancelledKeys.push(item.filePath ?? null)
      if (jobState?.items.has(item.id)) {
        jobState.items.delete(item.id)
      }
      cancelledCount++
    }

    // Remove the stored files for items that will never be screened.
    await deleteDocuments(cancelledKeys)

    if (cancelledCount > 0) {
      await refundCredit(
        orgId,
        cancelledCount,
        'REFUND',
        `Pengembalian ${cancelledCount} kredit karena antrean batch dibatalkan`
      )
    }

    // A batch with no remaining live items holds no work, so its state and
    // tenant lock are released. A batch that is still processing keeps them.
    const inFlight = await db
      .select()
      .from(inboxItems)
      .where(
        and(
          eq(inboxItems.organizationId, orgId),
          eq(inboxItems.jobId, jobId),
          inArray(inboxItems.status, ['queued', 'extracting', 'evaluating']),
        ),
      )
      .all()

    if (inFlight.length === 0) {
      jobBatchState.delete(jobId)
      activeBatchOrganizations.delete(orgId)
    }

    return {
      cancelledCount,
      refundedCredits: cancelledCount,
    }
  }

  /**
   * Removes stored files for a job's inbox items. Called before the job row is
   * deleted so the objects do not outlive the tenant's access to them.
   */
  static async deleteJobDocuments(jobId: number): Promise<void> {
    const items = await db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.jobId, jobId))
      .all()

    await deleteDocuments(items.map((item) => item.filePath))
    jobBatchState.delete(jobId)
  }

  /**
   * Get batch / real-time progress for a job inbox
   */
  static async getJobBatchStatus(jobId: number): Promise<BatchStatusResult> {
    const dbItems = await db.select().from(inboxItems).where(eq(inboxItems.jobId, jobId)).all() as any[]

    const memState = jobBatchState.get(jobId)

    const items: BatchProgressItem[] = dbItems.map((r) => {
      const mem = memState?.items.get(r.id)
      let status: BatchProgressItem['status'] = 'READY'

      if (mem?.status) {
        status = mem.status
      } else {
        const s = String(r.status).toLowerCase()
        if (s === 'queued') status = 'QUEUED'
        else if (s === 'extracting' || s === 'parsing') status = 'EXTRACTING'
        else if (s === 'evaluating' || s === 'processing') status = 'EVALUATING'
        else if (s === 'ready' || s === 'promoted' || s === 'dismissed') status = 'READY'
        else if (s === 'error') status = 'FAILED'
      }

      return {
        id: r.id,
        filename: r.filename,
        status,
        score: r.score ?? mem?.score ?? null,
        verdict: r.verdict ?? mem?.verdict ?? null,
        applicantName: r.name ?? null,
        error: r.status === 'error' ? (r.rationale || 'Gagal memproses CV') : null,
      }
    })

    const total = items.length
    const completed = items.filter((i) => i.status === 'READY').length
    const failed = items.filter((i) => i.status === 'FAILED').length
    const processed = completed + failed

    return {
      jobId,
      total,
      processed,
      completed,
      failed,
      items,
    }
  }
}
