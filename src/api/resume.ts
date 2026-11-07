import { Hono } from 'hono'
import { db } from '../db'
import { applicants } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { OrgEnv, requireTenant } from '../middleware/orgContext'
import { getWallet } from '../services/walletService'
import { candidateIntakeService } from '../services/candidateIntakeService'
import { isCorruptedFileError } from '../services/aiScreeningService'

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'txt'] as const

export const resumeRouter = new Hono<OrgEnv>()

resumeRouter.post('/:id/resume', async (c) => {
  try {
    const { orgId } = requireTenant(c)
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db
      .select()
      .from(applicants)
      .where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
      .get()
    if (!applicant) return c.notFound()

    // 1. Check wallet balance before processing
    const wallet = await getWallet(orgId)
    if (wallet.balance < 1) {
      return c.json(
        {
          error: 'INSUFFICIENT_CREDIT',
          message:
            'Saldo kredit tidak mencukupi untuk melakukan AI screening. Silakan Top Up terlebih dahulu.',
        },
        402
      )
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

    try {
      const intakeResult = await candidateIntakeService.submitSingleResume({
        orgId,
        jobId: applicant.jobId,
        applicantId: id,
        file: {
          filename: file.name,
          buffer,
        },
      })

      return c.json(intakeResult)
    } catch (intakeErr: any) {
      if (
        intakeErr.message === 'Insufficient credit balance' ||
        intakeErr.code === 'INSUFFICIENT_CREDIT'
      ) {
        return c.json(
          {
            error: 'INSUFFICIENT_CREDIT',
            message:
              'Saldo kredit tidak mencukupi untuk melakukan AI screening. Silakan Top Up terlebih dahulu.',
          },
          402
        )
      }

      const isCorrupt = isCorruptedFileError(intakeErr)

      if (isCorrupt) {
        return c.json(
          {
            success: false,
            error: 'CORRUPTED_FILE',
            message: 'File CV rusak atau tidak terbaca. 1 Kredit telah dikembalikan ke dompet Anda.',
            screening_status: 'error',
            screening_verdict: 'Error',
            screening_summary:
              'File CV rusak atau tidak terbaca. 1 Kredit telah dikembalikan ke saldo dompet.',
            refunded: true,
          },
          422
        )
      }

      throw intakeErr
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
