import { describe, it, expect, beforeAll } from 'bun:test'
import server from '../src/server'
import { db } from '../src/db'
import { organizations, jobs, applicants, creditWallets, creditTransactions } from '../src/db/schema'
import { eq, and } from 'drizzle-orm'
import { sessionHeadersFor } from './helpers/auth'

const org1Headers = await sessionHeadersFor(1)
const org2Headers = await sessionHeadersFor(2)
import { addCredit, getWallet } from '../src/services/walletService'

describe('AI Screening & Credit Deduction Integration Tests', () => {
  const orgId = 1
  let testJobId: number
  let richCandidateId: number
  let poorCandidateId: number

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

    // 2. Create Job
    const insertedJob = await db.insert(jobs).values({
      organizationId: orgId,
      title: 'Senior Frontend React Engineer',
      location: 'Jakarta / Remote',
      remote: 'Yes',
      postedAt: new Date().toISOString()
    }).returning().get()
    testJobId = insertedJob.id

    // 3. Create Applicants for testing
    const cand1 = await db.insert(applicants).values({
      organizationId: orgId,
      jobId: testJobId,
      name: 'Budi Santoso',
      email: 'budi.santoso@example.com',
      phone: '08123456789',
      status: 'Applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning().get()
    richCandidateId = cand1.id

    const cand2 = await db.insert(applicants).values({
      organizationId: orgId,
      jobId: testJobId,
      name: 'Dewi Lestari',
      email: 'dewi.lestari@example.com',
      phone: '08129876543',
      status: 'Applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning().get()
    poorCandidateId = cand2.id
  })

  it('rejects resume upload with 402 and INSUFFICIENT_CREDIT error when balance is 0', async () => {
    // Set wallet balance of Org 2 to 0
    const zeroOrgId = 2
    let w = await db.select().from(creditWallets).where(eq(creditWallets.organizationId, zeroOrgId)).get()
    if (!w) {
      await db.insert(creditWallets).values({
        organizationId: zeroOrgId,
        balance: 0,
        updatedAt: new Date().toISOString()
      })
    } else {
      await db.update(creditWallets).set({ balance: 0 }).where(eq(creditWallets.organizationId, zeroOrgId))
    }

    // Create applicant in Org 2
    const org2Job = await db.insert(jobs).values({
      organizationId: zeroOrgId,
      title: 'DevOps Specialist',
      location: 'Jakarta',
      remote: 'No',
      postedAt: new Date().toISOString()
    }).returning().get()

    const zeroCandidate = await db.insert(applicants).values({
      organizationId: zeroOrgId,
      jobId: org2Job.id,
      name: 'Joko Anwar',
      email: 'joko@zero-credit.com',
      phone: '08111222333',
      status: 'Applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning().get()

    // Form data with sample CV
    const form = new FormData()
    const sampleBlob = new Blob(['Resume Content: Joko Anwar, experienced in Docker, Linux, CI/CD.'], { type: 'text/plain' })
    form.append('resume', sampleBlob, 'joko-resume.txt')

    const res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${zeroCandidate.id}/resume`, {
      method: 'POST',
      headers: org2Headers,
      body: form
    }))

    expect(res.status).toBe(402)
    const data = await res.json()
    expect(data.error).toBe('INSUFFICIENT_CREDIT')
    expect(data.message).toContain('Saldo kredit tidak mencukupi')

    // Verify wallet balance is still 0 and no deduction happened
    const walletAfter = await getWallet(zeroOrgId)
    expect(walletAfter.balance).toBe(0)

    // Verify applicant screening status remains unchanged (pending)
    const freshApplicant = await db.select().from(applicants).where(and(eq(applicants.id, zeroCandidate.id), eq(applicants.organizationId, zeroOrgId))).get()
    expect(freshApplicant?.screeningStatus).toBe('pending')
  })

  it('successfully uploads resume, deducts 1 credit, creates transaction ledger, and returns screening result', async () => {
    // 1. Ensure org 1 has at least 5 credits
    const walletBefore = await getWallet(orgId)
    if (walletBefore.balance < 5) {
      await addCredit(orgId, 10, 'INITIAL_GRANT', 'Test setup credits')
    }
    const balanceBeforeDeduct = (await getWallet(orgId)).balance

    // 2. Prepare sample CV text
    const sampleCvText = `
Budi Santoso
Senior Frontend React Engineer
5 tahun pengalaman profesional di pengembangan web modern.
Keahlian teknis: React, TypeScript, JavaScript, Node.js, Git, CI/CD, CSS.
Pengalaman:
- Lead Frontend Developer di Tech Indonesia (2019 - sekarang)
- Mengembangkan aplikasi SaaS berbasis React dan TypeScript
`
    const form = new FormData()
    const cvBlob = new Blob([sampleCvText], { type: 'text/plain' })
    form.append('resume', cvBlob, 'budi-santoso-cv.txt')

    // 3. Make POST /api/applicants/:id/resume
    const res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${richCandidateId}/resume`, {
      method: 'POST',
      headers: org1Headers,
      body: form
    }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.screening_status).toBe('ready')
    expect(typeof json.screening.score).toBe('number')
    expect(json.screening.score).toBeGreaterThan(50)
    expect(json.screening.matchedSkills).toContain('React')
    expect(json.screening.matchedSkills).toContain('TypeScript')
    expect(['Strong', 'Potential', 'Weak']).toContain(json.screening.band)
    expect(['Hire', 'Consider', 'Pass']).toContain(json.screening.verdict)
    expect(json.screening.expYears).toBeGreaterThanOrEqual(1)

    // 4. Verify wallet balance decreased by exactly 1
    const walletAfter = await getWallet(orgId)
    expect(walletAfter.balance).toBe(balanceBeforeDeduct - 1)

    // 5. Verify transaction ledger entry
    const transactions = await db.select().from(creditTransactions)
      .where(and(
        eq(creditTransactions.organizationId, orgId),
        eq(creditTransactions.walletId, (await getWallet(orgId)).id)
      ))
      .all()
    expect(transactions.length).toBeGreaterThan(0)
    const screeningTxs = transactions.filter(t => t.description?.includes('Budi Santoso'))
    expect(screeningTxs.length).toBeGreaterThan(0)
    expect(screeningTxs[0].amount).toBe(-1)

    // 6. Verify applicant record in database has persisted screening results
    const savedApplicant = await db.select().from(applicants)
      .where(and(eq(applicants.id, richCandidateId), eq(applicants.organizationId, orgId)))
      .get()

    expect(savedApplicant?.screeningStatus).toBe('ready')
    expect(savedApplicant?.screeningScore).toBe(json.screening.score)
    expect(savedApplicant?.screeningBand).toBe(json.screening.band)
    expect(savedApplicant?.screeningVerdict).toBe(json.screening.verdict)
    expect(savedApplicant?.screeningMatched).toContain('React')
    expect(savedApplicant?.screeningSummary).toBeTruthy()
  })

  it('provides screening details via GET /api/applicants/:id/screening and GET /api/applicants/:id', async () => {
    const resScreening = await server.fetch(new Request(`http://localhost:3001/api/applicants/${richCandidateId}/screening`, {
      headers: org1Headers
    }))
    expect(resScreening.status).toBe(200)
    const screeningData = await resScreening.json()
    expect(screeningData.status).toBe('ready')
    expect(typeof screeningData.score).toBe('number')
    expect(screeningData.verdict).toBeTruthy()
    expect(Array.isArray(screeningData.matched)).toBe(true)

    const resApplicant = await server.fetch(new Request(`http://localhost:3001/api/applicants/${richCandidateId}`, {
      headers: org1Headers
    }))
    expect(resApplicant.status).toBe(200)
    const applicantData = await resApplicant.json()
    expect(applicantData.screening_status).toBe('ready')
    expect(applicantData.screening_score).toBe(screeningData.score)
    expect(applicantData.screening_verdict).toBe(screeningData.verdict)
    expect(applicantData.screening_summary).toBeTruthy()
  })
})
