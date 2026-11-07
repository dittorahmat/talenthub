import { Hono } from 'hono'
import { db } from '../db'
import { applicants, activities, jobs } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { OrgEnv, requireTenant } from '../middleware/orgContext'
import { getWallet, executeMetered } from '../services/walletService'
import { evaluateResume, isCorruptedOrUnreadableBuffer, CorruptedFileError } from '../services/aiScreeningService'
import { contentTypeForFilename, deleteDocument, putDocument } from '../services/documentStorage'

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'txt'] as const

export const resumeRouter = new Hono<OrgEnv>()

resumeRouter.post('/:id/resume', async (c) => {
  try {
    const { orgId } = requireTenant(c)
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

    const filename = `${id}-${randomUUID()}.${ext}`
    const storageKey = `orgs/${orgId}/applicants/${id}/${filename}`
    const resumeUrl = `/api/applicants/${id}/resume`

    await putDocument(storageKey, buffer, contentTypeForFilename(file.name))

    const now = new Date().toISOString()

    // Mark status as processing initially
    await db.update(applicants).set({
      resumeUrl,
      resumePath: storageKey,
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

    try {
      const { result } = await executeMetered(
        orgId,
        1,
        `AI Screening untuk pelamar: ${applicant.name}`,
        async () => {
          // Check if the file is unreadable / corrupted
          const isCorrupt = isCorruptedOrUnreadableBuffer(buffer, file.name)
          if (isCorrupt) {
            throw new CorruptedFileError('File CV rusak atau tidak terbaca')
          }

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

          return {
            evaluation,
            keywordsStr,
          }
        }
      )

      return c.json({
        success: true,
        resume_url: resumeUrl,
        resume_filename: file.name,
        resume_keywords: result.keywordsStr,
        screening_status: 'ready',
        screening: {
          score: result.evaluation.score,
          summary: result.evaluation.summary,
          band: result.evaluation.band,
          verdict: result.evaluation.verdict,
          matchedSkills: result.evaluation.matchedSkills,
          missingSkills: result.evaluation.missingSkills,
          expYears: result.evaluation.expYears,
          provider: result.evaluation.provider
        }
      })
    } catch (meteredErr: any) {
      if (
        meteredErr.message === 'Insufficient credit balance' ||
        meteredErr.code === 'INSUFFICIENT_CREDIT'
      ) {
        return c.json({
          error: 'INSUFFICIENT_CREDIT',
          message: 'Saldo kredit tidak mencukupi untuk melakukan AI screening. Silakan Top Up terlebih dahulu.'
        }, 402)
      }

      const isCorrupt =
        meteredErr instanceof CorruptedFileError ||
        meteredErr?.name === 'CorruptedFileError' ||
        /corrupt/i.test(meteredErr?.message || '')

      if (isCorrupt) {
        const errorSummary = 'File CV rusak atau tidak terbaca. 1 Kredit telah dikembalikan ke saldo dompet.'
        const errorTime = new Date().toISOString()

        // A corrupt upload must not linger in private storage.
        await deleteDocument(storageKey)

        await db.update(applicants).set({
          resumeUrl: null,
          resumePath: null,
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

      throw meteredErr
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
