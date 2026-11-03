import { Hono } from 'hono'
import { db } from '../db'
import { applicants, activities } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { promises as fs } from 'fs'
import path from 'path'
import { mockScreening, KEYWORD_POOL, hashInt } from './screening'
import { OrgEnv } from '../middleware/orgContext'

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'txt'] as const

export const resumeRouter = new Hono<OrgEnv>()

function extractKeywords(text: string): string[] {
  const lowerText = text.toLowerCase()
  return KEYWORD_POOL.filter(kw => lowerText.includes(kw.toLowerCase()))
}

resumeRouter.post('/:id/resume', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    const formData = await c.req.formData()
    const file = formData.get('resume') as File | null
    if (!file) return c.json({ error: 'No file provided' }, 400)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!(ALLOWED_EXTS as readonly string[]).includes(ext as any)) {
      return c.json({ error: 'Only PDF and DOCX files allowed' }, 400)
    }
    if (buffer.length > MAX_RESUME_BYTES) {
      return c.json({ error: 'File too large (max 5MB)' }, 400)
    }

    const filename = `${id}-${Date.now()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
    const filePath = path.join(uploadDir, filename)

    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(filePath, buffer)

    let extractedText = ''
    try {
      extractedText = buffer.toString('utf-8')
    } catch {
      extractedText = ''
    }

    const matchedKeywords = extractKeywords(extractedText)
    const keywordsStr = matchedKeywords.join(', ') || null

    const resumeUrl = `/uploads/resumes/${filename}`
    const now = new Date().toISOString()

    await db.update(applicants).set({
      resumeUrl,
      resumePath: filePath,
      resumeFilename: file.name,
      resumeKeywords: keywordsStr,
      screeningStatus: 'processing',
      screeningSummary: null,
      screeningScore: null,
      screeningBand: null,
      screeningMatched: null,
      screeningMissing: null,
      screeningExpYears: null,
      updatedAt: now,
    }).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))

    await db.insert(activities).values({
      organizationId: orgId,
      applicantId: id,
      type: 'resume_upload',
      description: `Resume diunggah: ${file.name}`,
      user: 'HR Admin',
      timestamp: now,
    })

    const applicantId = id
    const candidateName = applicant.name
    const resumeKeywordsSnapshot = keywordsStr

    const delayMs = 3000 + (Math.abs(hashInt(applicantId * 7919 + file.name.length)) % 2001)

    setTimeout(async () => {
      try {
        const fresh = await db.select().from(applicants).where(and(eq(applicants.id, applicantId), eq(applicants.organizationId, orgId))).get()
        if (!fresh) return

        const screeningResult = mockScreening(
          { id: applicantId, name: candidateName, resumeKeywords: resumeKeywordsSnapshot },
          { title: 'Posisi Terkait' }
        )

        const matchedStr = screeningResult.matched.join(', ') || null
        const missingStr = screeningResult.missing.join(', ') || null

        await db.update(applicants).set({
          screeningStatus: 'ready',
          screeningSummary: screeningResult.summary,
          screeningScore: screeningResult.score,
          screeningBand: screeningResult.band,
          screeningMatched: matchedStr,
          screeningMissing: missingStr,
          screeningExpYears: screeningResult.expYears,
          updatedAt: new Date().toISOString(),
        }).where(and(eq(applicants.id, applicantId), eq(applicants.organizationId, orgId)))

        await db.insert(activities).values({
          organizationId: orgId,
          applicantId,
          type: 'screening_complete',
          description: `Screening AI selesai: Skor ${screeningResult.score}/100 (${screeningResult.band})`,
          user: 'AI Screening System',
          timestamp: new Date().toISOString(),
        })
      } catch (e) {
        console.error('Async screening failed:', e)
      }
    }, delayMs)

    return c.json({
      success: true,
      resume_url: resumeUrl,
      resume_filename: file.name,
      resume_keywords: keywordsStr,
      screening_status: 'processing',
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
