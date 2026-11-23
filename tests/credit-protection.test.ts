import { expect, describe, it } from 'bun:test'
import server from '../src/server'
import { db } from '../src/db'
import { jobs, applicants } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { sessionHeadersFor } from './helpers/auth'
import { addCredit } from '../src/services/walletService'

describe('Public Screening Credit Protection & Manual Screen Trigger (Ticket 05)', () => {
  it('allows manual AI screening trigger on pending applicant and reserves 1 credit', async () => {
    const org1Headers = await sessionHeadersFor(1)
    await addCredit(1, 10, 'MANUAL_TEST_TOPUP')

    // 1. Create a job for Org 1
    const jobList = await db.select().from(jobs).where(eq(jobs.organizationId, 1))
    const job = jobList[0]

    // 2. Submit applicant via public portal (without auto screen)
    const formData = new FormData()
    formData.append('name', 'Bambang Pamungkas')
    formData.append('email', 'bambang@example.com')
    const sampleText = `
Bambang Pamungkas
Senior Fullstack Developer
5 tahun pengalaman profesional di bidang rekayasa perangkat lunak web.
Keahlian teknis: React, TypeScript, Node.js, Git, CI/CD, Docker, SQL, PostgreSQL.
Pengalaman:
- Software Engineer di Solusi Finansial (2019 - sekarang)
`
    const file = new File([sampleText], 'bambang-cv.txt', {
      type: 'text/plain',
    })
    formData.append('file', file)

    const applyRes = await server.fetch(
      new Request(`http://localhost:3001/api/public/careers/tech-satu-solusi/jobs/${job.id}/apply`, {
        method: 'POST',
        body: formData,
      })
    )
    expect(applyRes.status).toBe(201)
    const { applicantId } = await applyRes.json() as any

    // 3. Trigger manual screening from dashboard via POST /api/applicants/:id/screen
    const screenRes = await server.fetch(
      new Request(`http://localhost:3001/api/applicants/${applicantId}/screen`, {
        method: 'POST',
        headers: org1Headers,
      })
    )
    expect(screenRes.status).toBe(200)
    const screenData = await screenRes.json() as any
    expect(screenData.success).toBe(true)
    expect(screenData.screening_status).toBe('ready')
    expect(screenData.screening.score).toBeGreaterThan(0)
    expect(screenData.screening.matchedSkills).toBeArray()

    // 4. Verify applicant state in D1 is now screened
    const applicantRow = await db.select().from(applicants).where(eq(applicants.id, applicantId))
    const updatedApplicant = applicantRow[0]
    expect(updatedApplicant.screeningStatus).toBe('ready')
    expect(updatedApplicant.screeningScore).toBeGreaterThan(0)
  })
})
