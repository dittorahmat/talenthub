import {
  candidateIntakeService,
  CandidateIntakeService,
  BatchProgressItem,
  BatchStatusResult,
  IntakeFile,
} from './candidateIntakeService'

export type BatchItemInput = IntakeFile
export type { BatchProgressItem, BatchStatusResult }

export interface EnqueueBatchOptions {
  orgId: number
  jobId: number
  files: BatchItemInput[]
  autoProcessAsync?: boolean
}

/**
 * Adapter facade around CandidateIntakeService to preserve existing contract
 * and allow existing callers/tests to function seamlessly.
 */
export class BatchQueueService {
  static async checkPreFlightBalance(orgId: number, fileCount: number) {
    return candidateIntakeService.checkPreFlightBalance(orgId, fileCount)
  }

  static async enqueueBatch(options: EnqueueBatchOptions) {
    return candidateIntakeService.submitBatch({
      orgId: options.orgId,
      jobId: options.jobId,
      files: options.files,
      autoProcessAsync: options.autoProcessAsync,
    })
  }

  static async processBatchQueue(
    orgId: number,
    jobId: number,
    itemsToProcess: { id: number; buffer: Buffer; filename: string }[]
  ): Promise<void> {
    const { jobs } = await import('../db/schema')
    const { db } = await import('../db')
    const { eq } = await import('drizzle-orm')

    const jobRow = (await db.select().from(jobs).where(eq(jobs.id, jobId)).get()) as any
    const jobTitle = jobRow?.title || 'Posisi Pekerjaan'

    for (const item of itemsToProcess) {
      await candidateIntakeService.processInboxItem({
        orgId,
        jobId,
        itemId: item.id,
        buffer: item.buffer,
        filename: item.filename,
        jobTitle,
      })
    }
  }

  static async cancelQueuedBatch(orgId: number, jobId: number) {
    return candidateIntakeService.cancelBatch(orgId, jobId)
  }

  static async deleteJobDocuments(jobId: number) {
    return candidateIntakeService.deleteJobDocuments(jobId)
  }

  static async getJobBatchStatus(jobId: number) {
    // For legacy signature without orgId, retrieve orgId from job
    const { jobs } = await import('../db/schema')
    const { db } = await import('../db')
    const { eq } = await import('drizzle-orm')

    const job = (await db.select().from(jobs).where(eq(jobs.id, jobId)).get()) as any
    const orgId = job?.organizationId || 0
    return candidateIntakeService.getBatchProgress(orgId, jobId)
  }
}
