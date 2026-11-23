import { expect, describe, it } from 'bun:test'
import server from '../src/server'
import { db } from '../src/db'
import { organizations, jobs, applicants } from '../src/db/schema'
import { eq } from 'drizzle-orm'

describe('Public Career Portal & Candidate Self-Apply (Ticket 04)', () => {
  it('serves active public jobs for an organization slug', async () => {
    // Org 1 is seeded with slug "tech-satu-solusi"
    const res = await server.fetch(new Request('http://localhost:3001/api/public/careers/tech-satu-solusi'))
    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.organization.name).toBe('Tech Satu Solusi')
    expect(data.jobs).toBeArray()
    expect(data.jobs.length).toBeGreaterThanOrEqual(1)
  })

  it('submits a public application with resume and binds to job initial stage', async () => {
    // Get first job of Org 1
    const jobList = await db.select().from(jobs).where(eq(jobs.organizationId, 1))
    const targetJob = jobList[0]
    expect(targetJob).toBeDefined()

    const formData = new FormData()
    formData.append('name', 'Rizky Pratama')
    formData.append('email', 'rizky.pratama@example.com')
    formData.append('phone', '081234567890')
    const file = new File(['CV Content of Rizky Pratama, Fullstack Developer with React and Node'], 'rizky-cv.pdf', {
      type: 'application/pdf',
    })
    formData.append('file', file)

    const applyRes = await server.fetch(
      new Request(`http://localhost:3001/api/public/careers/tech-satu-solusi/jobs/${targetJob.id}/apply`, {
        method: 'POST',
        body: formData,
      })
    )

    expect(applyRes.status).toBe(201)
    const result = await applyRes.json() as any
    expect(result.success).toBe(true)
    expect(result.applicantId).toBeDefined()

    // Verify stored applicant in database
    const applicantRow = await db.select().from(applicants).where(eq(applicants.id, result.applicantId))
    const applicant = applicantRow[0]
    expect(applicant).toBeDefined()
    expect(applicant.name).toBe('Rizky Pratama')
    expect(applicant.source).toBe('Portal Karir Publik')
    expect(applicant.resumeFilename).toBe('rizky-cv.pdf')
  })
})
