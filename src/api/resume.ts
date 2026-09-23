import { Hono } from 'hono'
import { db } from '../db'
import { applicants, activities, jobs } from '../db/schema'
import { eq } from 'drizzle-orm'
import { promises as fs } from 'fs'
import path from 'path'
import { mockScreening, KEYWORD_POOL, hashInt } from './screening'

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'txt'] as const

export const resumeRouter = new Hono()

function extractKeywords(text: string): string[] {
  const lowerText = text.toLowerCase()
  return KEYWORD_POOL.filter(kw => lowerText.includes(kw.toLowerCase()))
}

resumeRouter.post('/:id/resume', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(eq(applicants.id, id)).get()
    if (!applicant) return c.notFound()

    const formData = await c.req.formData()
    const file = formData.get('resume') as File | null
    if (!file) return c.json({ error: 'No file provided' }, 400)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!(ALLOWED_EXTS as readonly string[]).includes(ext)) {
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
    } catch (_) {}
    const keywords = extractKeywords(extractedText)

    const now = new Date().toISOString()
    await db.update(applicants).set({
      resumePath: filePath,
      resumeFilename: file.name,
      resumeUrl: `/uploads/resumes/${filename}`,
      resumeKeywords: keywords.join(', '),
      screeningStatus: 'processing',
      updatedAt: now
    }).where(eq(applicants.id, id))

    await db.insert(activities).values({
      applicantId: id,
      type: 'resume_view',
      description: `Resume diunggah: ${file.name}`,
      user: 'HR Admin',
      timestamp: now
    })

    const delay = 2000 + (hashInt(id * 1009 + buffer.length) % 2001)
    setTimeout(async () => {
      try {
        const fresh = await db.select().from(applicants).where(eq(applicants.id, id)).get()
        if (!fresh) return
        const job = fresh.jobId ? await db.select().from(jobs).where(eq(jobs.id, fresh.jobId)).get() : null
        const jobTitle = job?.title ?? 'Senior Frontend Engineer'
        const result = mockScreening(
          { id: fresh.id, name: fresh.name, resumeKeywords: fresh.resumeKeywords },
          { title: jobTitle }
        )
        const doneAt = new Date().toISOString()
        await db.update(applicants).set({
          screeningStatus: 'ready',
          screeningSummary: result.summary,
          screeningScore: result.score,
          screeningBand: result.band,
          screeningMatched: result.matched.join(', '),
          screeningMissing: result.missing.join(', '),
          screeningExpYears: result.expYears,
          updatedAt: doneAt,
        }).where(eq(applicants.id, id))
        await db.insert(activities).values({
          applicantId: id,
          type: 'screening',
          description: `AI Screening selesai: skor ${result.score} (${result.band})`,
          user: 'Sistem',
          timestamp: doneAt,
        })
      } catch (_) {}
    }, delay)

    return c.json({
      success: true,
      filename: file.name,
      fileUrl: `/uploads/resumes/${filename}`,
      keywords,
      screeningStatus: 'processing'
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

resumeRouter.get('/:id/resume', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(eq(applicants.id, id)).get()
    if (!applicant || !applicant.resumeUrl) return c.notFound()

    return c.json({
      filePath: applicant.resumePath,
      fileUrl: applicant.resumeUrl,
      filename: applicant.resumeFilename,
      keywords: applicant.resumeKeywords ? applicant.resumeKeywords.split(', ') : []
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
