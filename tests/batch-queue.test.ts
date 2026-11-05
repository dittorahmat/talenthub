import { describe, it, expect, beforeAll } from 'bun:test'
import { db } from '../src/db'
import { organizations, jobs, creditWallets, creditTransactions, inboxItems } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { BatchQueueService } from '../src/services/batchQueueService'
import { getWallet } from '../src/services/walletService'

describe('Async Batch Upload with Queue & Preflight Tests', () => {
  let testOrgId: number
  let testJobId: number

  beforeAll(async () => {
    // Insert test organization
    const org = await db.insert(organizations).values({
      name: 'Batch Test Corp ' + Date.now(),
      slug: 'batch-test-' + Date.now(),
      createdAt: new Date().toISOString(),
    }).returning().get() as any
    testOrgId = org.id

    // Setup test organization wallet with 5 credits
    await db.insert(creditWallets).values({
      organizationId: testOrgId,
      balance: 5,
      updatedAt: new Date().toISOString(),
    }).run()

    // Insert test job
    const createdJob = await db.insert(jobs).values({
      organizationId: testOrgId,
      title: 'Fullstack Platform Engineer',
      location: 'Remote',
      remote: 'Yes',
      postedAt: '2026-11-03',
      applicantCount: 0,
    }).returning().get() as any
    testJobId = createdJob.id
  })

  it('rejects batch enqueue when balance is insufficient (preflight check)', async () => {
    // Current balance is 5, requesting 8 files
    const files = Array.from({ length: 8 }, (_, i) => ({
      filename: `candidate-${i}.pdf`,
      buffer: Buffer.from('%PDF-1.4 Mock CV text React TypeScript Node.js SQL'),
    }))

    const preflight = await BatchQueueService.checkPreFlightBalance(testOrgId, files.length)
    expect(preflight.allowed).toBe(false)
    expect(preflight.required).toBe(8)
    expect(preflight.current).toBe(5)
    expect(preflight.shortage).toBe(3)

    try {
      await BatchQueueService.enqueueBatch({
        orgId: testOrgId,
        jobId: testJobId,
        files,
        autoProcessAsync: false,
      })
      expect(true).toBe(false) // should not reach here
    } catch (err: any) {
      expect(err.code).toBe('INSUFFICIENT_CREDIT')
      expect(err.shortage).toBe(3)
    }
  })

  it('enqueues batch within credit limit, reserves credits, and processes items', async () => {
    // Current balance is 5, upload 3 files
    const files = [
      {
        filename: 'budi-frontend.txt',
        buffer: Buffer.from('Budi Santoso\nSenior Frontend Engineer\nSkills: React, TypeScript, JavaScript, CSS, Git\nPengalaman: 5 tahun membangun aplikasi enterprise.'),
      },
      {
        filename: 'corrupted-file.pdf',
        buffer: Buffer.from(''), // 0-byte triggers corruption refund
      },
      {
        filename: 'siti-backend.txt',
        buffer: Buffer.from('Siti Rahma\nBackend Developer\nSkills: Node.js, TypeScript, PostgreSQL, Docker, Redis\nPengalaman: 4 tahun backend microservices.'),
      },
    ]

    const enqueueResult = await BatchQueueService.enqueueBatch({
      orgId: testOrgId,
      jobId: testJobId,
      files,
      autoProcessAsync: false, // We will manually process to test state transition
    })

    expect(enqueueResult.success).toBe(true)
    expect(enqueueResult.queuedCount).toBe(3)
    expect(enqueueResult.reservedCredits).toBe(3)

    // Wallet balance should now be 5 - 3 = 2 (reserved)
    const walletAfterReserve = await getWallet(testOrgId)
    expect(walletAfterReserve.balance).toBe(2)

    // Manually process items
    const records = enqueueResult.items.map((it, idx) => ({
      id: it.id,
      filename: it.filename,
      buffer: files[idx].buffer,
    }))

    await BatchQueueService.processBatchQueue(testOrgId, testJobId, records)

    // File 1 (budi-frontend.txt) -> Valid, committed
    // File 2 (corrupted-file.pdf) -> Corrupted (0 bytes), refunded 1 credit
    // File 3 (siti-backend.txt) -> Valid, committed
    // Expected final balance: 2 + 1 (refund) = 3
    const finalWallet = await getWallet(testOrgId)
    expect(finalWallet.balance).toBe(3)

    // Check batch status
    const batchStatus = await BatchQueueService.getJobBatchStatus(testJobId)
    expect(batchStatus.total).toBeGreaterThanOrEqual(3)
    expect(batchStatus.completed).toBeGreaterThanOrEqual(2)
    expect(batchStatus.failed).toBeGreaterThanOrEqual(1)
  })

  it('cancels queued items, refunds them, and never processes them later', async () => {
    const suffix = Date.now()
    const org = (await db
      .insert(organizations)
      .values({
        name: `Cancel Corp ${suffix}`,
        slug: `cancel-corp-${suffix}`,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get()) as any

    const cancelOrgId = org.id
    await db.insert(creditWallets).values({
      organizationId: cancelOrgId,
      balance: 5,
      updatedAt: new Date().toISOString(),
    }).run()

    const job = (await db
      .insert(jobs)
      .values({
        organizationId: cancelOrgId,
        title: 'Backend Engineer',
        location: 'Remote',
        remote: 'Yes',
        postedAt: '2026-11-03',
      })
      .returning()
      .get()) as any

    const files = Array.from({ length: 5 }, (_, i) => ({
      filename: `cancel-candidate-${i}.txt`,
      buffer: Buffer.from('React TypeScript Node.js Docker SQL'),
    }))

    const enqueueResult = await BatchQueueService.enqueueBatch({
      orgId: cancelOrgId,
      jobId: job.id,
      files,
      autoProcessAsync: false,
    })
    expect(enqueueResult.queuedCount).toBe(5)

    const cancelResult = await BatchQueueService.cancelQueuedBatch(cancelOrgId, job.id)
    expect(cancelResult.cancelledCount).toBe(5)
    expect((await getWallet(cancelOrgId)).balance).toBe(5)

    const records = enqueueResult.items.map((item, index) => ({
      id: item.id,
      filename: item.filename,
      buffer: files[index].buffer,
    }))
    await BatchQueueService.processBatchQueue(cancelOrgId, job.id, records)

    const rows = await db.select().from(inboxItems).where(eq(inboxItems.jobId, job.id)).all()
    expect(rows).toHaveLength(5)
    expect(rows.every((row) => row.status === 'dismissed')).toBe(true)
    expect((await getWallet(cancelOrgId)).balance).toBe(5)
  })
})
