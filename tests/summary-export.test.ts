import { describe, it, expect, beforeAll } from 'bun:test'
import server from '../src/server'
import { db } from '../src/db'
import { organizations, jobs, applicants } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { formatWhatsAppSummary, generateInterviewQuestions } from '../src/utils/summaryExport'

describe('Candidate 1-Page AI Summary Export Tests', () => {
  const orgId = 1
  let testJobId: number
  let testCandidateId: number

  beforeAll(async () => {
    // 1. Ensure Organization
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
      title: 'Senior Fullstack Engineer',
      location: 'Jakarta',
      remote: 'Yes',
      postedAt: new Date().toISOString()
    }).returning().get()
    testJobId = insertedJob.id

    // 3. Create Applicant with pre-populated screening data
    const insertedApplicant = await db.insert(applicants).values({
      organizationId: orgId,
      jobId: testJobId,
      name: 'Rian Pratama',
      email: 'rian.pratama@example.com',
      phone: '081234567890',
      status: 'Interview',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning().get()

    testCandidateId = insertedApplicant.id

    // Update with screening values
    await db.update(applicants).set({
      screeningStatus: 'ready',
      screeningScore: 88,
      screeningBand: 'Strong',
      screeningVerdict: 'Hire',
      screeningSummary: 'Kandidat memiliki fondasi arsitektur frontend dan backend yang solid dengan pengalaman 6 tahun.',
      screeningMatched: 'React, TypeScript, Node.js, PostgreSQL',
      screeningMissing: 'Kubernetes, AWS Lambda',
      screeningExpYears: 6
    } as any).where(eq(applicants.id, testCandidateId))
  })

  it('generates interview questions accurately based on missing skill gaps', () => {
    const missing = ['Kubernetes', 'AWS Lambda']
    const questions = generateInterviewQuestions(missing, 'Senior Fullstack Engineer')

    expect(questions.length).toBeGreaterThanOrEqual(2)
    expect(questions[0]).toContain('Kubernetes')
    expect(questions[1]).toContain('AWS Lambda')

    // Fallback when no missing skills
    const genericQuestions = generateInterviewQuestions([], 'Engineering Lead')
    expect(genericQuestions.length).toBeGreaterThanOrEqual(2)
    expect(genericQuestions[0]).toContain('Engineering Lead')
  })

  it('formats clean WhatsApp / Slack share text with markdown and all required sections', () => {
    const shareText = formatWhatsAppSummary({
      candidateName: 'Rian Pratama',
      appliedRole: 'Senior Fullstack Engineer',
      appliedDate: '03 Nov 2026',
      score: 88,
      verdict: 'Hire',
      summary: 'Kandidat memiliki fondasi arsitektur frontend dan backend yang solid.',
      matchedSkills: ['React', 'TypeScript', 'Node.js'],
      missingSkills: ['Kubernetes', 'AWS Lambda'],
      expYears: 6
    })

    expect(shareText).toContain('*Ringkasan Kandidat - Rian Pratama*')
    expect(shareText).toContain('Posisi: Senior Fullstack Engineer')
    expect(shareText).toContain('Skor Kecocokan AI: 88/100 (Hire)')
    expect(shareText).toContain('Pengalaman: 6 tahun')
    expect(shareText).toContain('*Ringkasan Eksekutif AI:*')
    expect(shareText).toContain('*Keahlian Utama yang Cocok:*')
    expect(shareText).toContain('React, TypeScript, Node.js')
    expect(shareText).toContain('*Keahlian yang Perlu Dieksplorasi (Gap):*')
    expect(shareText).toContain('Kubernetes, AWS Lambda')
    expect(shareText).toContain('*Rekomendasi Pertanyaan Wawancara:*')
    expect(shareText).toContain('TalentHub')
  })

  it('serves structured export and summary via GET /api/applicants/:id', async () => {
    const res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${testCandidateId}`, {
      headers: { 'x-organization-id': String(orgId) }
    }))

    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.name).toBe('Rian Pratama')
    expect(json.screening_score).toBe(88)
    expect(json.screening_verdict).toBe('Hire')
    expect(json.screening_matched).toContain('React')
    expect(json.screening_missing).toContain('Kubernetes')
    expect(Array.isArray(json.interview_questions)).toBe(true)
    expect(json.interview_questions.length).toBeGreaterThan(0)
    expect(json.summary_export).toBeDefined()
    expect(json.summary_export.candidate_name).toBe('Rian Pratama')
    expect(json.summary_export.score).toBe(88)
    expect(json.summary_export.whatsapp_share_text).toContain('*Ringkasan Kandidat - Rian Pratama*')
  })

  it('serves dedicated summary endpoint via GET /api/applicants/:id/summary', async () => {
    const res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${testCandidateId}/summary`, {
      headers: { 'x-organization-id': String(orgId) }
    }))

    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.candidate_name).toBe('Rian Pratama')
    expect(json.applied_role).toBe('Senior Fullstack Engineer')
    expect(json.screening_score).toBe(88)
    expect(json.screening_verdict).toBe('Hire')
    expect(json.matched_skills).toContain('React')
    expect(json.missing_skills).toContain('Kubernetes')
    expect(json.interview_questions.some((q: string) => q.includes('Kubernetes'))).toBe(true)
    expect(json.whatsapp_share_text).toContain('*Ringkasan Kandidat - Rian Pratama*')
    expect(json.whatsapp_share_text).toContain('88/100 (Hire)')
  })
})
