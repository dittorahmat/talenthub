import { describe, it, expect, beforeAll } from 'bun:test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import server from '../src/server'
import { db } from '../src/db'
import { applicants, jobs, organizations, creditWallets, inboxItems, candidateShareTokens } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { addCredit } from '../src/services/walletService'
import { BatchQueueService } from '../src/services/batchQueueService'
import { sessionHeadersFor } from './helpers/auth'

const org1Headers = await sessionHeadersFor(1)
const org2Headers = await sessionHeadersFor(2)

async function createApplicant(jobId: number, name: string): Promise<number> {
  const res = await server.fetch(new Request('http://localhost:3001/api/applicants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...org1Headers,
    },
    body: JSON.stringify({
      job_id: jobId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    }),
  }))
  expect(res.status).toBe(201)
  const data = (await res.json()) as { id: number }
  return data.id
}

async function uploadResume(applicantId: number, filename: string, content: string): Promise<Response> {
  const form = new FormData()
  form.append('resume', new File([content], filename, { type: 'text/plain' }))
  return server.fetch(new Request(`http://localhost:3001/api/applicants/${applicantId}/resume`, {
    method: 'POST',
    headers: org1Headers,
    body: form,
  }))
}

describe('Private candidate document storage', () => {
  let jobId: number

  beforeAll(async () => {
    const job = await db.select().from(jobs).where(eq(jobs.organizationId, 1)).get()
    if (!job) throw new Error('Org 1 must have a seeded job')
    jobId = job.id
    await addCredit(1, 5, 'INITIAL_GRANT', 'Document storage test credits')
  })

  it('stores an upload outside the published asset tree and serves it only to its tenant', async () => {
    const applicantId = await createApplicant(jobId, 'Storage Owner')
    const upload = await uploadResume(applicantId, 'storage-owner.txt', 'React TypeScript Docker')
    expect(upload.status).toBe(200)
    const uploaded = (await upload.json()) as { resume_url: string }
    expect(uploaded.resume_url).toBe(`/api/applicants/${applicantId}/resume`)

    // Nothing lands in the published tree.
    const published = path.join(process.cwd(), 'public', 'uploads')
    expect(existsSync(published)).toBe(false)

    const owner = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/${applicantId}/resume`, { headers: org1Headers }),
    )
    expect(owner.status).toBe(200)
    expect(owner.headers.get('content-type')).toContain('text/plain')
    expect(await owner.text()).toBe('React TypeScript Docker')

    const otherTenant = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/${applicantId}/resume`, { headers: org2Headers }),
    )
    expect(otherTenant.status).toBe(404)

    const anonymous = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/${applicantId}/resume`),
    )
    expect(anonymous.status).toBe(401)

    // The share token is the only public credential, and it serves the document and summary.
    const shareRes = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/${applicantId}/share-token`, {
        method: 'POST',
        headers: org1Headers,
      }),
    )
    expect(shareRes.status).toBe(200)
    const share = (await shareRes.json()) as { token: string }

    const shareSummary = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/public/share/${share.token}`),
    )
    expect(shareSummary.status).toBe(200)
    const summaryData = (await shareSummary.json()) as { name: string; jobTitle: string }
    expect(summaryData.name).toBe('Storage Owner')

    const shareDoc = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/public/share/${share.token}/resume`),
    )
    expect(shareDoc.status).toBe(200)
    expect(await shareDoc.text()).toBe('React TypeScript Docker')

    const bogusShare = await server.fetch(
      new Request('http://localhost:3001/api/applicants/public/share/not-a-real-token/resume'),
    )
    expect(bogusShare.status).toBe(404)

    // Expired share token returns 404
    await db.insert(candidateShareTokens).values({
      token: 'expired-test-token',
      applicantId,
      organizationId: 1,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date(Date.now() - 10000).toISOString(),
    })
    const expiredShare = await server.fetch(
      new Request('http://localhost:3001/api/applicants/public/share/expired-test-token'),
    )
    expect(expiredShare.status).toBe(404)

    // Deleting the applicant removes the stored object and invalidates public share tokens.
    const deleted = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/${applicantId}`, {
        method: 'DELETE',
        headers: org1Headers,
      }),
    )
    expect(deleted.status).toBe(200)
    const afterDelete = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/${applicantId}/resume`, { headers: org1Headers }),
    )
    expect(afterDelete.status).toBe(404)

    const afterDeleteShare = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/public/share/${share.token}`),
    )
    expect(afterDeleteShare.status).toBe(404)

    const afterDeleteShareDoc = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/public/share/${share.token}/resume`),
    )
    expect(afterDeleteShareDoc.status).toBe(404)
  })
})

describe('Batch upload bounds', () => {
  async function createTenant(label: string): Promise<{ orgId: number; jobId: number }> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const org = (await db
      .insert(organizations)
      .values({
        name: `${label} ${suffix}`,
        slug: `${label}-${suffix}`.toLowerCase(),
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get()) as { id: number }

    await db.insert(creditWallets).values({
      organizationId: org.id,
      balance: 0,
      updatedAt: new Date().toISOString(),
    })

    const job = (await db
      .insert(jobs)
      .values({
        organizationId: org.id,
        title: 'Backend Engineer',
        location: 'Remote',
        remote: 'Yes',
        postedAt: '2026-11-03',
      })
      .returning()
      .get()) as { id: number }

    return { orgId: org.id, jobId: job.id }
  }

  it('rejects a declared body above the request limit before parsing it', async () => {
    const { orgId, jobId } = await createTenant('oversize')
    await addCredit(orgId, 5, 'INITIAL_GRANT', 'Batch bounds test credits')

    const oversizedBody = new Uint8Array(26 * 1024 * 1024)
    const res = await server.fetch(
      new Request(`http://localhost:3001/api/jobs/${jobId}/inbox`, {
        method: 'POST',
        headers: await sessionHeadersFor(orgId),
        body: oversizedBody,
      }),
    )
    expect(res.status).toBe(413)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe('PAYLOAD_TOO_LARGE')
  })

  it('rejects a request with more files than the configured maximum', async () => {
    const { orgId, jobId } = await createTenant('many-files')
    await addCredit(orgId, 60, 'INITIAL_GRANT', 'Batch bounds test credits')

    const form = new FormData()
    for (let i = 0; i < 51; i += 1) {
      form.append('files', new File(['React TypeScript'], `candidate-${i}.txt`, { type: 'text/plain' }))
    }

    const res = await server.fetch(
      new Request(`http://localhost:3001/api/jobs/${jobId}/inbox`, {
        method: 'POST',
        headers: await sessionHeadersFor(orgId),
        body: form,
      }),
    )
    expect(res.status).toBe(413)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe('TOO_MANY_FILES')
  })

  it('still accepts a legitimate five-megabyte CV', async () => {
    const { orgId, jobId } = await createTenant('five-mb')
    await addCredit(orgId, 2, 'INITIAL_GRANT', 'Batch bounds test credits')

    const fiveMegabytes = new Uint8Array(5 * 1024 * 1024)
    fiveMegabytes.fill(65)
    const form = new FormData()
    form.append('files', new File([fiveMegabytes], 'big-cv.txt', { type: 'text/plain' }))

    const res = await server.fetch(
      new Request(`http://localhost:3001/api/jobs/${jobId}/inbox`, {
        method: 'POST',
        headers: await sessionHeadersFor(orgId),
        body: form,
      }),
    )
    expect(res.status).toBe(201)
    const data = (await res.json()) as { reservedCredits: number }
    expect(data.reservedCredits).toBe(1)
  })

  it('removes stored files when a queued batch is cancelled and never screens it later', async () => {
    const { orgId, jobId } = await createTenant('cancel-files')
    await addCredit(orgId, 5, 'INITIAL_GRANT', 'Batch bounds test credits')

    const files = Array.from({ length: 3 }, (_, i) => ({
      filename: `cancel-${i}.txt`,
      buffer: Buffer.from('React TypeScript Docker'),
    }))

    const enqueued = await BatchQueueService.enqueueBatch({
      orgId,
      jobId,
      files,
      autoProcessAsync: false,
    })
    expect(enqueued.queuedCount).toBe(3)

    const cancel = await BatchQueueService.cancelQueuedBatch(orgId, jobId)
    expect(cancel.cancelledCount).toBe(3)

    const rows = await db.select().from(inboxItems).where(eq(inboxItems.jobId, jobId)).all()
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.status === 'dismissed')).toBe(true)

    // The stored objects are gone, so the authorized download route 404s.
    for (const row of rows) {
      const download = await server.fetch(
        new Request(`http://localhost:3001/api/inbox/${row.id}/resume`, {
          headers: await sessionHeadersFor(orgId),
        }),
      )
      expect(download.status).toBe(404)
    }

    // A cancelled batch releases the tenant concurrency slot.
    const next = await BatchQueueService.enqueueBatch({
      orgId,
      jobId,
      files: [{ filename: 'after-cancel.txt', buffer: Buffer.from('Node.js SQL') }],
      autoProcessAsync: false,
    })
    expect(next.queuedCount).toBe(1)
    await BatchQueueService.cancelQueuedBatch(orgId, jobId)
  })
})
