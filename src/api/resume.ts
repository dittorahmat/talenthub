import { Hono } from 'hono'
import { db } from '../db'
import { applicants, activities, jobs } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { promises as fs } from 'fs'
import path from 'path'
import { OrgEnv } from '../middleware/orgContext'
import { getWallet, reserveCredit, commitCredit, refundCredit } from '../services/walletService'
import { evaluateResume, isCorruptedOrUnreadableBuffer } from '../services/aiScreeningService'

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'txt'] as const

export const resumeRouter = new Hono<OrgEnv>()

resumeRouter.post('/:id/resume', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    // 1. Check wallet balance before processing
    const wallet = await getWallet(orgId)
    if (wallet.balance < 1) {
      return c.json({
        error: 'INSUFFICIENT_CREDIT',
        message: 'Saldo kredit tidak mencukupi untuk melakukan AI screening. Silakan Top Up terlebih dahulu.'
      }, 402)
    }

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

    // 2. Atomically reserve 1 credit
    try {
      await reserveCredit(orgId, 1, `AI Screening reservation untuk pelamar: ${applicant.name}`)
    } catch (err: any) {
      return c.json({
        error: 'INSUFFICIENT_CREDIT',
        message: 'Saldo kredit tidak mencukupi untuk melakukan AI screening. Silakan Top Up terlebih dahulu.'
      }, 402)
    }

    const filename = `${id}-${Date.now()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
    const filePath = path.join(uploadDir, filename)

    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(filePath, buffer)

    const resumeUrl = `/uploads/resumes/${filename}`
    const now = new Date().toISOString()

    // Mark status as processing initially
    await db.update(applicants).set({
      resumeUrl,
      resumePath: filePath,
      resumeFilename: file.name,
      screeningStatus: 'processing',
      screeningSummary: null,
      screeningScore: null,
      screeningBand: null,
      screeningVerdict: null,
      screeningMatched: null,
      screeningMissing: null,
      screeningExpYears: null,
      updatedAt: now,
    }).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))

    await db.insert(activities).values({
      organizationId: orgId,
      applicantId: id,
      type: 'resume_upload',
      description: `Resume diunggah: ${file.name} (1 kredit di-reserve)`,
      user: 'HR Admin',
      timestamp: now,
    })

    // Check if the file is unreadable / corrupted
    const isCorrupt = isCorruptedOrUnreadableBuffer(buffer, file.name)
    if (isCorrupt) {
      // Automatic refund
      await refundCredit(
        orgId,
        1,
        'REFUND_CORRUPTED_FILE',
        'Pengembalian 1 kredit karena file CV rusak atau tidak terbaca'
      )

      const errorSummary = 'File CV rusak atau tidak terbaca. 1 Kredit telah dikembalikan ke saldo dompet.'
      const errorTime = new Date().toISOString()

      await db.update(applicants).set({
        screeningStatus: 'error',
        screeningVerdict: 'Error',
        screeningSummary: errorSummary,
        screeningScore: null,
        screeningBand: 'Weak',
        updatedAt: errorTime,
      }).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))

      await db.insert(activities).values({
        organizationId: orgId,
        applicantId: id,
        type: 'screening_failed',
        description: `Screening gagal: File rusak / tidak terbaca. 1 kredit otomatis dikembalikan ke dompet.`,
        user: 'AI Screening System',
        timestamp: errorTime,
      })

      return c.json({
        success: false,
        error: 'CORRUPTED_FILE',
        message: 'File CV rusak atau tidak terbaca. 1 Kredit telah dikembalikan ke dompet Anda.',
        screening_status: 'error',
        screening_verdict: 'Error',
        screening_summary: errorSummary,
        refunded: true,
      }, 422)
    }

    // Normal successful flow: Commit the deduction
    await commitCredit(orgId, String(applicant.id), `AI Screening untuk pelamar: ${applicant.name}`)

    // Fetch related job title
    const jobRow = await db.select().from(jobs).where(and(eq(jobs.id, applicant.jobId), eq(jobs.organizationId, orgId))).get()
    const jobTitle = jobRow?.title || 'Posisi Terkait'

    // Perform AI screening evaluation
    const evaluation = await evaluateResume({
      resumeBuffer: buffer,
      jobTitle,
      applicantName: applicant.name
    })

    const matchedStr = evaluation.matchedSkills.join(', ') || null
    const missingStr = evaluation.missingSkills.join(', ') || null
    const keywordsStr = matchedStr

    const completionTime = new Date().toISOString()
    await db.update(applicants).set({
      resumeKeywords: keywordsStr,
      screeningStatus: 'ready',
      screeningSummary: evaluation.summary,
      screeningScore: evaluation.score,
      screeningBand: evaluation.band,
      screeningVerdict: evaluation.verdict,
      screeningMatched: matchedStr,
      screeningMissing: missingStr,
      screeningExpYears: evaluation.expYears,
      updatedAt: completionTime,
    }).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))

    await db.insert(activities).values({
      organizationId: orgId,
      applicantId: id,
      type: 'screening_complete',
      description: `Screening AI selesai (${evaluation.provider}): Skor ${evaluation.score}/100 (${evaluation.band} - ${evaluation.verdict})`,
      user: 'AI Screening System',
      timestamp: completionTime,
    })

    return c.json({
      success: true,
      resume_url: resumeUrl,
      resume_filename: file.name,
      resume_keywords: keywordsStr,
      screening_status: 'ready',
      screening: {
        score: evaluation.score,
        summary: evaluation.summary,
        band: evaluation.band,
        verdict: evaluation.verdict,
        matchedSkills: evaluation.matchedSkills,
        missingSkills: evaluation.missingSkills,
        expYears: evaluation.expYears,
        provider: evaluation.provider
      }
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
