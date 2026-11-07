import { db } from '../db'
import { applicants, activities, jobs, inboxItems, jobKnockouts } from '../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  reserveCredit,
  commitCredit,
  refundCredit,
  getWallet,
  executeMetered,
} from './walletService'
import {
  evaluateResume,
  isCorruptedOrUnreadableBuffer,
  CorruptedFileError,
  AIEvaluationResult,
} from './aiScreeningService'
import {
  contentTypeForFilename,
  deleteDocument,
  deleteDocuments,
  putDocument,
} from './documentStorage'
import { extractKeywords, hashInt } from '../api/screening'

// --- Interfaces & Types ---

export interface QueuePort {
  send(message: unknown): Promise<void>
  sendBatch(messages: unknown[]): Promise<void>
}

export interface IntakeFile {
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

export interface SingleResumeResult {
  success: boolean
  resume_url: string
  resume_filename: string
  resume_keywords: string | null
  screening_status: 'ready' | 'error'
  screening: {
    score: number
    summary: string
    band: string
    verdict: string
    matchedSkills: string[]
    missingSkills: string[]
    expYears: number
    provider?: string
  }
}

export interface IntakeQueueMessage {
  type: 'EVALUATE_INBOX_ITEM'
  orgId: number
  jobId: number
  itemId: number
  filename: string
  storageKey: string
  timestamp: string
}

// --- Sanitization & Helpers ---

export function sanitizeCandidateName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '')
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim()
  if (!cleaned) return 'Kandidat'
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// --- Concrete Queue Adapters ---

/**
 * CloudflareQueueAdapter forwards messages to the native Cloudflare Queue (env.CV_QUEUE)
 */
export class CloudflareQueueAdapter implements QueuePort {
  constructor(private queueBinding: { send: (msg: unknown) => Promise<unknown>; sendBatch?: (msgs: { body: unknown }[]) => Promise<unknown> }) {}

  async send(message: unknown): Promise<void> {
    await this.queueBinding.send(message)
  }

  async sendBatch(messages: unknown[]): Promise<void> {
    if (this.queueBinding.sendBatch) {
      await this.queueBinding.sendBatch(messages.map((body) => ({ body })))
    } else {
      for (const msg of messages) {
        await this.queueBinding.send(msg)
      }
    }
  }
}

/**
 * InMemorySyncQueueAdapter executes queued messages in-process for testing and local environments.
 */
export class InMemorySyncQueueAdapter implements QueuePort {
  constructor(private intakeServiceResolver: () => CandidateIntakeService) {}

  async send(message: unknown): Promise<void> {
    const service = this.intakeServiceResolver()
    await service.consumeQueueMessage(message)
  }

  async sendBatch(messages: unknown[]): Promise<void> {
    for (const msg of messages) {
      await this.send(msg)
    }
  }
}

// --- CandidateIntakeService Engine ---

export class CandidateIntakeService {
  private queuePort: QueuePort

  constructor(queuePort?: QueuePort) {
    this.queuePort = queuePort || new InMemorySyncQueueAdapter(() => this)
  }

  setQueuePort(queuePort: QueuePort): void {
    this.queuePort = queuePort
  }

  getQueuePort(): QueuePort {
    return this.queuePort
  }

  /**
   * Preflight check balance before accepting candidate resumes
   */
  async checkPreFlightBalance(orgId: number, count: number): Promise<{
    allowed: boolean
    required: number
    current: number
    shortage: number
  }> {
    const wallet = await getWallet(orgId)
    const current = wallet.balance
    const required = count
    const shortage = Math.max(0, required - current)
    return {
      allowed: current >= required,
      required,
      current,
      shortage,
    }
  }

  /**
   * Submit and screen a single resume directly using executeMetered
   */
  async submitSingleResume(options: {
    orgId: number
    jobId: number
    applicantId: number
    file: IntakeFile
  }): Promise<SingleResumeResult> {
    const { orgId, jobId, applicantId, file } = options
    const { filename, buffer } = file

    const applicant = await db
      .select()
      .from(applicants)
      .where(and(eq(applicants.id, applicantId), eq(applicants.organizationId, orgId)))
      .get()
    if (!applicant) {
      throw new Error('Applicant not found')
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'txt'
    const storageKey = `orgs/${orgId}/applicants/${applicantId}/${applicantId}-${randomUUID()}.${ext}`
    const resumeUrl = `/api/applicants/${applicantId}/resume`

    await putDocument(storageKey, buffer, contentTypeForFilename(filename))

    const now = new Date().toISOString()
    await db
      .update(applicants)
      .set({
        resumeUrl,
        resumePath: storageKey,
        resumeFilename: filename,
        screeningStatus: 'processing',
        screeningSummary: null,
        screeningScore: null,
        screeningBand: null,
        screeningVerdict: null,
        screeningMatched: null,
        screeningMissing: null,
        screeningExpYears: null,
        updatedAt: now,
      })
      .where(and(eq(applicants.id, applicantId), eq(applicants.organizationId, orgId)))

    await db.insert(activities).values({
      organizationId: orgId,
      applicantId,
      type: 'resume_upload',
      description: `Resume diunggah: ${filename} (1 kredit di-reserve)`,
      user: 'HR Admin',
      timestamp: now,
    })

    try {
      const { result } = await executeMetered(
        orgId,
        1,
        `AI Screening untuk pelamar: ${applicant.name}`,
        async () => {
          if (isCorruptedOrUnreadableBuffer(buffer, filename)) {
            throw new CorruptedFileError('File CV rusak atau tidak terbaca')
          }

          const jobRow = await db
            .select()
            .from(jobs)
            .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, orgId)))
            .get()
          const jobTitle = jobRow?.title || 'Posisi Terkait'

          const evaluation = await evaluateResume({
            resumeBuffer: buffer,
            jobTitle,
            applicantName: applicant.name,
          })

          const matchedStr = evaluation.matchedSkills.join(', ') || null
          const missingStr = evaluation.missingSkills.join(', ') || null
          const keywordsStr = matchedStr

          const completionTime = new Date().toISOString()
          await db
            .update(applicants)
            .set({
              resumeKeywords: keywordsStr,
              screeningStatus: 'ready',
              screeningSummary: evaluation.summary,
              screeningScore: evaluation.score,
              screeningBand: evaluation.band,
              screeningVerdict: evaluation.verdict,
              screeningMatched: matchedStr,
              screeningMissing: missingStr,
              screeningExpYears: evaluation.expYears,
              updatedAt: completionTime,
            })
            .where(and(eq(applicants.id, applicantId), eq(applicants.organizationId, orgId)))

          await db.insert(activities).values({
            organizationId: orgId,
            applicantId,
            type: 'screening_complete',
            description: `Screening AI selesai (${evaluation.provider}): Skor ${evaluation.score}/100 (${evaluation.band} - ${evaluation.verdict})`,
            user: 'AI Screening System',
            timestamp: completionTime,
          })

          return { evaluation, keywordsStr }
        }
      )

      return {
        success: true,
        resume_url: resumeUrl,
        resume_filename: filename,
        resume_keywords: result.keywordsStr,
        screening_status: 'ready',
        screening: {
          score: result.evaluation.score,
          summary: result.evaluation.summary,
          band: result.evaluation.band,
          verdict: result.evaluation.verdict,
          matchedSkills: result.evaluation.matchedSkills,
          missingSkills: result.evaluation.missingSkills,
          expYears: result.evaluation.expYears,
          provider: result.evaluation.provider,
        },
      }
    } catch (meteredErr: any) {
      const isCorrupt =
        meteredErr instanceof CorruptedFileError ||
        meteredErr?.name === 'CorruptedFileError' ||
        /corrupt/i.test(meteredErr?.message || '')

      if (isCorrupt) {
        await deleteDocument(storageKey)
        const errorSummary = 'File CV rusak atau tidak terbaca. 1 Kredit telah dikembalikan ke saldo dompet.'
        const errorTime = new Date().toISOString()

        await db
          .update(applicants)
          .set({
            resumeUrl: null,
            resumePath: null,
            screeningStatus: 'error',
            screeningVerdict: 'Error',
            screeningSummary: errorSummary,
            screeningScore: null,
            screeningBand: 'Weak',
            updatedAt: errorTime,
          })
          .where(and(eq(applicants.id, applicantId), eq(applicants.organizationId, orgId)))

        await db.insert(activities).values({
          organizationId: orgId,
          applicantId,
          type: 'screening_failed',
          description: `Screening gagal: File rusak / tidak terbaca. 1 kredit otomatis dikembalikan ke dompet.`,
          user: 'AI Screening System',
          timestamp: errorTime,
        })
      }

      throw meteredErr
    }
  }

  /**
   * Submit a batch of CV files to a job inbox with atomic reservation and queue dispatch.
   */
  async submitBatch(options: {
    orgId: number
    jobId: number
    files: IntakeFile[]
    autoProcessAsync?: boolean
  }): Promise<{
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

    // 1. Preflight balance check
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

    const queuedItems: BatchProgressItem[] = []
    const queueMessages: IntakeQueueMessage[] = []

    for (const file of files) {
      const ext = file.filename.split('.').pop()?.toLowerCase() || 'txt'
      const sanitizedName = sanitizeCandidateName(file.filename)
      const storageKey = `orgs/${orgId}/jobs/${jobId}/inbox/${randomUUID()}.${ext}`

      await putDocument(storageKey, file.buffer, contentTypeForFilename(file.filename))

      let extractedText = ''
      try {
        extractedText = file.buffer.toString('utf-8')
      } catch {
        extractedText = ''
      }

      const sample = extractedText.slice(0, 200_000)
      const emailMatch = sample.match(/[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,24}/)
      const phoneMatch = sample.match(/(?:\+62|62|08)[0-9\s-]{8,14}/)
      const extractedEmail = emailMatch ? emailMatch[0] : null
      const extractedPhone = phoneMatch ? phoneMatch[0].trim() : null
      const keywordsArr = extractKeywords(sample)
      const keywordsStr = keywordsArr.join(', ') || null

      const now = new Date().toISOString()
      const inserted = (await db
        .insert(inboxItems)
        .values({
          organizationId: orgId,
          jobId,
          filename: file.filename,
          filePath: storageKey,
          fileUrl: '',
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
        })
        .returning()
        .get()) as any

      queuedItems.push({
        id: inserted.id,
        filename: file.filename,
        status: 'QUEUED',
        score: null,
        verdict: null,
        applicantName: sanitizedName,
      })

      queueMessages.push({
        type: 'EVALUATE_INBOX_ITEM',
        orgId,
        jobId,
        itemId: inserted.id,
        filename: file.filename,
        storageKey,
        timestamp: now,
      })
    }

    // 3. Dispatch to Queue
    if (autoProcessAsync) {
      // Async dispatch using QueuePort
      this.queuePort.sendBatch(queueMessages).catch((err) => {
        console.error(`[CandidateIntakeService] Failed to send messages to QueuePort for job ${jobId}:`, err)
      })
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
   * Consumes an incoming queue message (from Cloudflare Queue or In-Memory runner)
   */
  async consumeQueueMessage(message: unknown): Promise<void> {
    const msg = message as IntakeQueueMessage
    if (!msg || msg.type !== 'EVALUATE_INBOX_ITEM') return

    const { orgId, jobId, itemId, filename, storageKey } = msg

    // Fetch inbox item to verify status
    const item = (await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.id, itemId), eq(inboxItems.organizationId, orgId)))
      .get()) as any

    if (!item) return

    // If item was already processed, dismissed, or promoted, do nothing (idempotent)
    if (item.status !== 'queued' && item.status !== 'extracting' && item.status !== 'evaluating') {
      return
    }

    // Read file buffer from document storage
    const { getDocument } = await import('./documentStorage')
    const doc = await getDocument(storageKey)
    const buffer = doc ? Buffer.from(doc.data) : Buffer.from('')

    const jobRow = (await db.select().from(jobs).where(eq(jobs.id, jobId)).get()) as any
    const jobTitle = jobRow?.title || 'Posisi Pekerjaan'

    await this.processInboxItem({
      orgId,
      jobId,
      itemId,
      buffer,
      filename,
      jobTitle,
    })
  }

  /**
   * Process a single queued inbox item through state transitions with atomic commit or refund
   */
  async processInboxItem(params: {
    orgId: number
    jobId: number
    itemId: number
    buffer: Buffer
    filename: string
    jobTitle: string
  }): Promise<void> {
    const { orgId, jobId, itemId, buffer, filename, jobTitle } = params

    try {
      // 1. EXTRACTING - Atomic claim: only claim if still 'queued'
      const claimed = await db
        .update(inboxItems)
        .set({ status: 'extracting' })
        .where(and(eq(inboxItems.id, itemId), eq(inboxItems.status, 'queued')))
        .returning()
        .all()

      if (claimed.length === 0) {
        // Was already claimed, cancelled, or processed
        return
      }

      // Check corrupted or unreadable buffer
      const isCorrupt = isCorruptedOrUnreadableBuffer(buffer, filename)
      if (isCorrupt) {
        await refundCredit(
          orgId,
          1,
          'REFUND_CORRUPTED_FILE',
          `Refund 1 credit: file CV ${filename} rusak atau tidak terbaca (Batch Item #${itemId})`
        )

        await db
          .update(inboxItems)
          .set({
            status: 'error',
            verdict: 'Pass',
            rationale: 'File CV rusak atau tidak terbaca (Kredit dikembalikan)',
          })
          .where(eq(inboxItems.id, itemId))
          .run()
        return
      }

      // 2. EVALUATING
      await db
        .update(inboxItems)
        .set({ status: 'evaluating' })
        .where(eq(inboxItems.id, itemId))
        .run()

      const itemRow = (await db.select().from(inboxItems).where(eq(inboxItems.id, itemId)).get()) as any
      const candidateName = itemRow?.name || sanitizeCandidateName(filename)

      const evalResult = await evaluateResume({
        resumeBuffer: buffer,
        jobTitle,
        applicantName: candidateName,
      })

      // Knockout check
      const knockouts = (await db
        .select()
        .from(jobKnockouts)
        .where(eq(jobKnockouts.jobId, jobId))
        .all()) as any[]

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
        `Screening batch CV ${candidateName} (${filename})`
      )

      // 3. READY
      await db
        .update(inboxItems)
        .set({
          status: 'ready',
          score: evalResult.score,
          band: evalResult.band,
          verdict,
          rationale: evalResult.summary,
          knockoutResult: knockoutFailed,
          keywords: evalResult.matchedSkills.join(', '),
        })
        .where(eq(inboxItems.id, itemId))
        .run()
    } catch (err: any) {
      console.error(`[CandidateIntakeService] Failed to process inbox item #${itemId}:`, err)
      await refundCredit(
        orgId,
        1,
        'REFUND_PROCESSING_ERROR',
        `Refund 1 credit: error pemrosesan CV ${filename} (Batch Item #${itemId})`
      ).catch(() => {})

      await db
        .update(inboxItems)
        .set({
          status: 'error',
          rationale: `Gagal memproses berkas: ${err?.message || 'Unknown error'}`,
        })
        .where(eq(inboxItems.id, itemId))
        .run()
        .catch(() => {})
    }
  }

  /**
   * Get batch / real-time progress for a job inbox directly from durable DB state
   */
  async getBatchProgress(orgId: number, jobId: number): Promise<BatchStatusResult> {
    const dbItems = (await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.organizationId, orgId), eq(inboxItems.jobId, jobId)))
      .all()) as any[]

    const items: BatchProgressItem[] = dbItems.map((r) => {
      let status: BatchProgressItem['status'] = 'READY'
      const s = String(r.status).toLowerCase()
      if (s === 'queued') status = 'QUEUED'
      else if (s === 'extracting' || s === 'parsing') status = 'EXTRACTING'
      else if (s === 'evaluating' || s === 'processing') status = 'EVALUATING'
      else if (s === 'ready' || s === 'promoted' || s === 'dismissed') status = 'READY'
      else if (s === 'error') status = 'FAILED'

      return {
        id: r.id,
        filename: r.filename,
        status,
        score: r.score ?? null,
        verdict: r.verdict ?? null,
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

  /**
   * Cancels remaining queued items for a job inbox and refunds reserved credits.
   */
  async cancelBatch(orgId: number, jobId: number): Promise<{
    cancelledCount: number
    refundedCredits: number
  }> {
    // Atomically move only still-queued rows to dismissed.
    const cancelledItems = (await db
      .update(inboxItems)
      .set({
        status: 'dismissed',
        rationale: 'Dibatalkan oleh pengguna (kredit dikembalikan)',
      })
      .where(
        and(
          eq(inboxItems.organizationId, orgId),
          eq(inboxItems.jobId, jobId),
          eq(inboxItems.status, 'queued')
        )
      )
      .returning()
      .all()) as any[]

    let cancelledCount = 0
    const cancelledKeys: Array<string | null> = []
    for (const item of cancelledItems) {
      cancelledKeys.push(item.filePath ?? null)
      cancelledCount++
    }

    await deleteDocuments(cancelledKeys)

    if (cancelledCount > 0) {
      await refundCredit(
        orgId,
        cancelledCount,
        'REFUND',
        `Pengembalian ${cancelledCount} kredit karena antrean batch dibatalkan`
      )
    }

    return {
      cancelledCount,
      refundedCredits: cancelledCount,
    }
  }

  /**
   * Promote an inbox item to full applicant
   */
  async promoteInboxItem(
    orgId: number,
    itemId: number,
    overrides?: { name?: string; email?: string }
  ): Promise<{
    applicant: any
    inboxItemId: number
  }> {
    const item = (await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.id, itemId), eq(inboxItems.organizationId, orgId)))
      .get()) as any

    if (!item) {
      const err: any = new Error('Inbox item not found')
      err.status = 404
      throw err
    }

    if (item.promotedApplicantId || item.status === 'promoted') {
      const err: any = new Error('Already promoted')
      err.status = 409
      throw err
    }

    const name = (overrides?.name && overrides.name.trim()) || item.name || sanitizeCandidateName(item.filename)
    const email = (overrides?.email && overrides.email.trim().toLowerCase()) || item.email || `inbox-${itemId}@example.com`

    const now = new Date().toISOString()
    const inserted = (await db
      .insert(applicants)
      .values({
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
      })
      .returning()
      .get()) as any

    await db
      .update(applicants)
      .set({ resumeUrl: `/api/applicants/${inserted.id}/resume` })
      .where(eq(applicants.id, inserted.id))

    await db
      .insert(activities)
      .values({
        organizationId: orgId,
        applicantId: inserted.id,
        type: 'status_change',
        description: `Kandidat dipromosikan dari inbox: ${inserted.name}`,
        user: 'HR Admin',
        timestamp: now,
      })
      .run()

    await db
      .update(inboxItems)
      .set({ status: 'promoted', promotedApplicantId: inserted.id })
      .where(and(eq(inboxItems.id, itemId), eq(inboxItems.organizationId, orgId)))
      .run()

    return {
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
    }
  }

  /**
   * Delete documents belonging to a job
   */
  async deleteJobDocuments(jobId: number): Promise<void> {
    const items = await db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.jobId, jobId))
      .all()

    await deleteDocuments(items.map((item) => item.filePath))
  }
}

// Global singleton instance
export const candidateIntakeService = new CandidateIntakeService()
