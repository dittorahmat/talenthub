import { describe, it, expect, beforeAll } from 'bun:test'
import { db } from '../src/db'
import { organizations, jobs, creditWallets, creditTransactions, inboxItems, applicants } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import {
  CandidateIntakeService,
  QueuePort,
  candidateIntakeService,
} from '../src/services/candidateIntakeService'
import { getWallet } from '../src/services/walletService'

describe('Candidate Intake Service & Queue Port Architecture Tests', () => {
  let testOrgId: number
  let testJobId: number

  beforeAll(async () => {
    const org = (await db
      .insert(organizations)
      .values({
        name: 'Intake Port Corp ' + Date.now(),
        slug: 'intake-port-' + Date.now(),
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get()) as any
    testOrgId = org.id

    await db.insert(creditWallets).values({
      organizationId: testOrgId,
      balance: 10,
      updatedAt: new Date().toISOString(),
    }).run()

    const createdJob = (await db
      .insert(jobs)
      .values({
        organizationId: testOrgId,
        title: 'Lead Platform Architect',
        location: 'Remote',
        remote: 'Yes',
        postedAt: '2026-11-08',
        applicantCount: 0,
      })
      .returning()
      .get()) as any
    testJobId = createdJob.id
  })

  it('allows plugging a custom QueuePort and dispatches queued messages to it', async () => {
    const sentMessages: any[] = []
    const customQueue: QueuePort = {
      async send(message: unknown) {
        sentMessages.push(message)
      },
      async sendBatch(messages: unknown[]) {
        sentMessages.push(...messages)
      },
    }

    const service = new CandidateIntakeService(customQueue)
    expect(service.getQueuePort()).toBe(customQueue)

    const files = [
      {
        filename: 'candidate-queue-1.txt',
        buffer: Buffer.from('Dewi Lestari\nSoftware Engineer\nSkills: Go, Kubernetes, TypeScript'),
      },
      {
        filename: 'candidate-queue-2.txt',
        buffer: Buffer.from('Bambang Pamungkas\nLead DevOps\nSkills: AWS, Terraform, Docker'),
      },
    ]

    const batchResult = await service.submitBatch({
      orgId: testOrgId,
      jobId: testJobId,
      files,
      autoProcessAsync: true,
    })

    expect(batchResult.success).toBe(true)
    expect(batchResult.queuedCount).toBe(2)
    expect(batchResult.reservedCredits).toBe(2)

    // Give asynchronous dispatch tick to fire
    await new Promise((r) => setTimeout(r, 50))

    expect(sentMessages.length).toBe(2)
    expect(sentMessages[0].type).toBe('EVALUATE_INBOX_ITEM')
    expect(sentMessages[0].orgId).toBe(testOrgId)
    expect(sentMessages[0].jobId).toBe(testJobId)

    // Now consume the message through consumeQueueMessage simulating Worker queue handler
    await service.consumeQueueMessage(sentMessages[0])

    const progress = await service.getBatchProgress(testOrgId, testJobId)
    const item1 = progress.items.find((i) => i.id === sentMessages[0].itemId)
    expect(item1).toBeDefined()
    expect(item1?.status).toBe('READY')
  })

  it('supports single resume submission and promotion via CandidateIntakeService', async () => {
    // 1. Create applicant for single resume
    const applicant = (await db
      .insert(applicants)
      .values({
        organizationId: testOrgId,
        jobId: testJobId,
        name: 'Single Upload Candidate',
        email: 'single@upload.com',
        phone: '08123456789',
        source: 'Upload',
        status: 'Applied',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get()) as any

    const singleResult = await candidateIntakeService.submitSingleResume({
      orgId: testOrgId,
      jobId: testJobId,
      applicantId: applicant.id,
      file: {
        filename: 'single-cv.txt',
        buffer: Buffer.from('Single Candidate\nSkills: TypeScript, Bun, Cloudflare Workers, D1'),
      },
    })

    expect(singleResult.success).toBe(true)
    expect(singleResult.screening_status).toBe('ready')
    expect(singleResult.screening.score).toBeGreaterThan(0)

    // 2. Test promotion of an inbox item
    const batch = await candidateIntakeService.submitBatch({
      orgId: testOrgId,
      jobId: testJobId,
      files: [
        {
          filename: 'candidate-to-promote.txt',
          buffer: Buffer.from('Promote Me\nSkills: React, Redux, Tailwind'),
        },
      ],
      autoProcessAsync: true,
    })

    // In-memory sync adapter processes automatically
    const inboxItemId = batch.items[0].id
    const promoted = await candidateIntakeService.promoteInboxItem(testOrgId, inboxItemId, {
      name: 'Promoted Super Candidate',
    })

    expect(promoted.applicant).toBeDefined()
    expect(promoted.applicant.name).toBe('Promoted Super Candidate')
    expect(promoted.inboxItemId).toBe(inboxItemId)
  })
})
