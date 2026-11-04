import { describe, it, expect, beforeAll } from 'bun:test'
import server from '../src/server'
import { db } from '../src/db'
import { organizations, jobs, applicants, creditWallets, creditTransactions } from '../src/db/schema'
import { eq, and } from 'drizzle-orm'
import { sessionHeadersFor } from './helpers/auth'

const org1Headers = await sessionHeadersFor(1)
const org2Headers = await sessionHeadersFor(2)
import { addCredit, getWallet, reserveCredit, refundCredit, commitCredit } from '../src/services/walletService'

describe('Atomic Reserve and Refund on Failure Integration Tests', () => {
  const orgId = 1
  let testJobId: number

  beforeAll(async () => {
    // 1. Ensure Organization exists
    const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).get()
    if (!org) {
      await db.insert(organizations).values({
        id: orgId,
        name: 'Tech Satu Solusi',
        slug: 'tech-satu-solusi',
        createdAt: new Date().toISOString()
      })
    }

    // 2. Ensure test job
    const insertedJob = await db.insert(jobs).values({
      organizationId: orgId,
      title: 'Fullstack Engineer (Reserve & Refund Test)',
      location: 'Jakarta',
      remote: 'Yes',
      postedAt: new Date().toISOString()
    }).returning().get()
    testJobId = insertedJob.id

    // Ensure wallet has balance
    const wallet = await getWallet(orgId)
    if (wallet.balance < 10) {
      await addCredit(orgId, 20, 'TEST_SETUP', 'Top up test balance')
    }
  })

  it('verifies walletService reserve, commit, and refund operations directly', async () => {
    const initialWallet = await getWallet(orgId)
    const initialBalance = initialWallet.balance

    // 1. Reserve 2 credits
    const reserveRes = await reserveCredit(orgId, 2, 'Test direct reserve')
    expect(reserveRes.success).toBe(true)
    expect(reserveRes.newBalance).toBe(initialBalance - 2)
    expect(reserveRes.transaction.type).toBe('RESERVED')
    expect(reserveRes.transaction.amount).toBe(-2)

    // 2. Commit credit
    const commitRes = await commitCredit(orgId, 'ref-123', 'Test direct commit', 2)
    expect(commitRes.success).toBe(true)
    expect(commitRes.transaction.type).toBe('SETTLED')

    // 3. Refund credit
    const refundRes = await refundCredit(orgId, 2, 'REFUND_CORRUPTED_FILE', 'Test direct refund')
    expect(refundRes.success).toBe(true)
    expect(refundRes.newBalance).toBe(initialBalance)
    expect(refundRes.transaction.type).toBe('REFUND_CORRUPTED_FILE')
    expect(refundRes.transaction.amount).toBe(2)
  })

  it('verifies normal successful parsing commits deduction and records ledger', async () => {
    const candidate = await db.insert(applicants).values({
      organizationId: orgId,
      jobId: testJobId,
      name: 'Rian Pratama',
      email: 'rian.pratama@test.com',
      phone: '08123456780',
      status: 'Applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning().get()

    const initialBalance = (await getWallet(orgId)).balance

    const validCv = `
Rian Pratama
Fullstack Engineer
4 tahun pengalaman membangun sistem web menggunakan React, TypeScript, Node.js, SQL, dan Docker.
`
    const form = new FormData()
    const cvBlob = new Blob([validCv], { type: 'text/plain' })
    form.append('resume', cvBlob, 'rian-cv.txt')

    const res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${candidate.id}/resume`, {
      method: 'POST',
      headers: org1Headers,
      body: form
    }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.screening_status).toBe('ready')

    // Balance should be decreased by exactly 1
    const finalBalance = (await getWallet(orgId)).balance
    expect(finalBalance).toBe(initialBalance - 1)

    // Verify ledger has both RESERVED and SETTLED
    const txs = await db.select().from(creditTransactions)
      .where(eq(creditTransactions.organizationId, orgId))
      .all()

    const hasReserved = txs.some(t => t.type === 'RESERVED' && t.description?.includes(candidate.name))
    const hasSettled = txs.some(t => t.type === 'SETTLED' && t.description?.includes(candidate.name))
    expect(hasReserved).toBe(true)
    expect(hasSettled).toBe(true)
  })

  it('verifies corrupted / unreadable file triggers automatic refund of 1 credit and marks status error', async () => {
    const candidate = await db.insert(applicants).values({
      organizationId: orgId,
      jobId: testJobId,
      name: 'Eko Corrupt Test',
      email: 'eko.corrupt@test.com',
      phone: '08123456781',
      status: 'Applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning().get()

    const initialBalance = (await getWallet(orgId)).balance

    // Create corrupted/empty buffer or keyword simulated corruption
    const form = new FormData()
    const corruptBlob = new Blob(['[CORRUPT_OR_PASSWORD_PROTECTED_DATA]'], { type: 'application/pdf' })
    form.append('resume', corruptBlob, 'corrupt-cv.pdf')

    const res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${candidate.id}/resume`, {
      method: 'POST',
      headers: org1Headers,
      body: form
    }))

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe('CORRUPTED_FILE')
    expect(json.refunded).toBe(true)
    expect(json.message).toContain('1 Kredit telah dikembalikan')
    expect(json.screening_status).toBe('error')

    // Balance must be exactly restored back to initial balance (Net 0 deduction)
    const finalBalance = (await getWallet(orgId)).balance
    expect(finalBalance).toBe(initialBalance)

    // Verify ledger reflects initial RESERVED (-1) and subsequent refund (+1)
    const txs = await db.select().from(creditTransactions)
      .where(eq(creditTransactions.organizationId, orgId))
      .all()

    const reservedTx = txs.find(t => t.type === 'RESERVED' && t.description?.includes(candidate.name))
    const refundTx = txs.reverse().find(t => t.type === 'REFUND_CORRUPTED_FILE')

    expect(reservedTx).toBeDefined()
    expect(reservedTx?.amount).toBe(-1)

    expect(refundTx).toBeDefined()
    expect(refundTx?.amount).toBe(1)
    expect(refundTx?.description).toContain('file CV rusak atau tidak terbaca')

    // Verify applicant status in DB is marked as error
    const updatedApplicant = await db.select().from(applicants)
      .where(and(eq(applicants.id, candidate.id), eq(applicants.organizationId, orgId)))
      .get()

    expect(updatedApplicant?.screeningStatus).toBe('error')
    expect(updatedApplicant?.screeningVerdict).toBe('Error')
    expect(updatedApplicant?.screeningSummary).toContain('File CV rusak atau tidak terbaca')
  })

  it('verifies 0-byte or unextractable empty content triggers refund', async () => {
    const candidate = await db.insert(applicants).values({
      organizationId: orgId,
      jobId: testJobId,
      name: 'Siti Empty File',
      email: 'siti.empty@test.com',
      phone: '08123456782',
      status: 'Applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning().get()

    const initialBalance = (await getWallet(orgId)).balance

    // Create completely empty text file
    const form = new FormData()
    const emptyBlob = new Blob(['   \n\t   '], { type: 'text/plain' })
    form.append('resume', emptyBlob, 'empty-cv.txt')

    const res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${candidate.id}/resume`, {
      method: 'POST',
      headers: org1Headers,
      body: form
    }))

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toBe('CORRUPTED_FILE')
    expect(json.refunded).toBe(true)

    // Net balance unchanged
    const finalBalance = (await getWallet(orgId)).balance
    expect(finalBalance).toBe(initialBalance)
  })
})
