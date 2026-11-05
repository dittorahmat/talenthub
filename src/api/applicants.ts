import { Hono } from 'hono'
import { db } from '../db'
import { jobs, applicants, notes, activities } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { OrgEnv } from '../middleware/orgContext'
import { generateInterviewQuestions, formatWhatsAppSummary } from '../utils/summaryExport'
import { deleteDocument, getDocument } from '../services/documentStorage'
import crypto from 'crypto'

export const applicantsRouter = new Hono<OrgEnv>()

// In-memory token store for public candidate intelligence sharing
const shareTokenStore = new Map<string, { applicantId: number; expiresAt: number }>()

function safeDownloadFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'document'
}

function documentResponse(document: { data: ArrayBuffer; contentType: string }, filename: string): Response {
  return new Response(document.data, {
    headers: {
      'Content-Type': document.contentType,
      'Content-Disposition': `attachment; filename="${safeDownloadFilename(filename)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

applicantsRouter.post('/:id/share-token', async (c) => {
  const orgId = c.get('orgId') || 1
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.notFound()
  const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
  if (!applicant) return c.notFound()

  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  shareTokenStore.set(token, { applicantId: id, expiresAt })

  return c.json({
    token,
    shareUrl: `/share/candidate/${token}`,
    expiresAt: new Date(expiresAt).toISOString(),
  })
})

applicantsRouter.get('/public/share/:token', async (c) => {
  const token = c.req.param('token')
  const entry = shareTokenStore.get(token)
  if (!entry || entry.expiresAt < Date.now()) {
    return c.json({ error: 'Tautan telah kadaluarsa atau tidak valid' }, 404)
  }

  const applicant = await db.select().from(applicants).where(eq(applicants.id, entry.applicantId)).get() as any
  if (!applicant) return c.notFound()
  const job = await db.select().from(jobs).where(eq(jobs.id, applicant.jobId)).get() as any

  const matched = applicant.screeningMatched ? applicant.screeningMatched.split(', ').filter(Boolean) : []
  const missing = applicant.screeningMissing ? applicant.screeningMissing.split(', ').filter(Boolean) : []

  return c.json({
    name: applicant.name,
    jobTitle: job?.title ?? 'Posisi Pekerjaan',
    score: applicant.screeningScore,
    band: applicant.screeningBand,
    verdict: applicant.screeningVerdict,
    summary: applicant.screeningSummary,
    matchedSkills: matched,
    missingSkills: missing,
    interviewQuestions: generateInterviewQuestions(missing),
  })
})

/**
 * The share token is the only credential on this route. It resolves to exactly
 * one applicant, so the document cannot be swapped for another tenant's file.
 */
applicantsRouter.get('/public/share/:token/resume', async (c) => {
  const token = c.req.param('token')
  const entry = shareTokenStore.get(token)
  if (!entry || entry.expiresAt < Date.now()) {
    return c.json({ error: 'Tautan telah kadaluarsa atau tidak valid' }, 404)
  }

  const applicant = await db.select().from(applicants).where(eq(applicants.id, entry.applicantId)).get()
  if (!applicant || !applicant.resumePath) return c.notFound()

  const document = await getDocument(applicant.resumePath)
  if (!document) return c.notFound()

  return documentResponse(document, applicant.resumeFilename || `resume-${applicant.id}`)
})

applicantsRouter.get('/:id/resume', async (c) => {
  const orgId = c.get('orgId')
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.notFound()

  const applicant = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
    .get()
  if (!applicant || !applicant.resumePath) return c.notFound()

  const document = await getDocument(applicant.resumePath)
  if (!document) return c.notFound()

  return documentResponse(document, applicant.resumeFilename || `resume-${id}`)
})

applicantsRouter.get('/:id/screening', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()
    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    const status = (applicant as any).screeningStatus ?? 'pending'
    if (!status || status === 'pending') {
      return c.json({ error: 'Screening not available' }, 404)
    }
    if (status === 'processing') {
      return c.json({
        status: 'processing',
        summary: null,
        score: null,
        band: null,
        matched: [],
        missing: [],
        expYears: null,
      })
    }
    return c.json({
      status: (applicant as any).screeningStatus,
      summary: (applicant as any).screeningSummary,
      score: (applicant as any).screeningScore,
      band: (applicant as any).screeningBand,
      verdict: (applicant as any).screeningVerdict,
      matched: (applicant as any).screeningMatched ? (applicant as any).screeningMatched.split(', ').filter(Boolean) : [],
      missing: (applicant as any).screeningMissing ? (applicant as any).screeningMissing.split(', ').filter(Boolean) : [],
      expYears: (applicant as any).screeningExpYears,
      interviewQuestions: generateInterviewQuestions(
        (applicant as any).screeningMissing ? (applicant as any).screeningMissing.split(', ').filter(Boolean) : []
      ),
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.get('/:id/summary', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    const job = await db.select().from(jobs).where(and(eq(jobs.id, applicant.jobId), eq(jobs.organizationId, orgId))).get()
    const a = applicant as any

    const matchedSkills = a.screeningMatched ? a.screeningMatched.split(', ').filter(Boolean) : []
    const missingSkills = a.screeningMissing ? a.screeningMissing.split(', ').filter(Boolean) : []
    const roleTitle = job?.title || 'Posisi Terkait'
    const questions = generateInterviewQuestions(missingSkills, roleTitle)
    const formattedDate = applicant.createdAt ? new Date(applicant.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini'

    const whatsappShareText = formatWhatsAppSummary({
      candidateName: applicant.name,
      appliedRole: roleTitle,
      appliedDate: formattedDate,
      score: a.screeningScore,
      verdict: a.screeningVerdict,
      summary: a.screeningSummary,
      matchedSkills,
      missingSkills,
      expYears: a.screeningExpYears,
      interviewQuestions: questions
    })

    return c.json({
      candidate_id: applicant.id,
      candidate_name: applicant.name,
      candidate_email: applicant.email,
      candidate_phone: applicant.phone,
      applied_role: roleTitle,
      applied_date: applicant.createdAt,
      applied_date_formatted: formattedDate,
      status: applicant.status,
      screening_status: a.screeningStatus ?? 'pending',
      screening_score: a.screeningScore ?? null,
      screening_band: a.screeningBand ?? null,
      screening_verdict: a.screeningVerdict ?? null,
      screening_summary: a.screeningSummary ?? null,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      screening_exp_years: a.screeningExpYears ?? null,
      interview_questions: questions,
      whatsapp_share_text: whatsappShareText
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.get('/:id', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    const job = await db.select().from(jobs).where(and(eq(jobs.id, applicant.jobId), eq(jobs.organizationId, orgId))).get()
    const appNotes = await db.select().from(notes).where(and(eq(notes.applicantId, id), eq(notes.organizationId, orgId))).orderBy(desc(notes.createdAt)).all()
    const appActivities = await db.select().from(activities).where(and(eq(activities.applicantId, id), eq(activities.organizationId, orgId))).orderBy(desc(activities.timestamp)).all()

    const a = applicant as any
    return c.json({
      id: applicant.id,
      organization_id: applicant.organizationId,
      job_id: applicant.jobId,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      source: applicant.source,
      status: applicant.status,
      resume_url: applicant.resumeUrl,
      resume_path: applicant.resumePath,
      resume_filename: applicant.resumeFilename,
      resume_keywords: applicant.resumeKeywords,
      created_at: applicant.createdAt,
      screening_status: a.screeningStatus ?? 'pending',
      screening_summary: a.screeningSummary ?? null,
      screening_score: a.screeningScore ?? null,
      screening_band: a.screeningBand ?? null,
      screening_verdict: a.screeningVerdict ?? null,
      screening_matched: a.screeningMatched ? a.screeningMatched.split(', ').filter(Boolean) : [],
      screening_missing: a.screeningMissing ? a.screeningMissing.split(', ').filter(Boolean) : [],
      screening_exp_years: a.screeningExpYears ?? null,
      interview_questions: generateInterviewQuestions(
        a.screeningMissing ? a.screeningMissing.split(', ').filter(Boolean) : [],
        job?.title || 'posisi yang dilamar'
      ),
      job: job ? { id: job.id, organization_id: job.organizationId, title: job.title, location: job.location, remote: job.remote } : null,
      notes: appNotes.map(n => ({ id: n.id, applicantId: n.applicantId, text: n.text, author: n.author, created_at: n.createdAt })),
      activities: appActivities.map(act => ({ id: act.id, applicantId: act.applicantId, type: act.type, description: act.description, user: act.user, timestamp: act.timestamp })),
      summary_export: {
        candidate_name: applicant.name,
        applied_role: job?.title || 'Unknown Role',
        applied_date: applicant.createdAt,
        score: a.screeningScore ?? null,
        band: a.screeningBand ?? null,
        verdict: a.screeningVerdict ?? null,
        summary: a.screeningSummary ?? null,
        matched_skills: a.screeningMatched ? a.screeningMatched.split(', ').filter(Boolean) : [],
        missing_skills: a.screeningMissing ? a.screeningMissing.split(', ').filter(Boolean) : [],
        exp_years: a.screeningExpYears ?? null,
        interview_questions: generateInterviewQuestions(
          a.screeningMissing ? a.screeningMissing.split(', ').filter(Boolean) : [],
          job?.title || 'posisi yang dilamar'
        ),
        whatsapp_share_text: formatWhatsAppSummary({
          candidateName: applicant.name,
          appliedRole: job?.title || 'Posisi Terkait',
          appliedDate: applicant.createdAt ? new Date(applicant.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini',
          score: a.screeningScore,
          verdict: a.screeningVerdict,
          summary: a.screeningSummary,
          matchedSkills: a.screeningMatched ? a.screeningMatched.split(', ').filter(Boolean) : [],
          missingSkills: a.screeningMissing ? a.screeningMissing.split(', ').filter(Boolean) : [],
          expYears: a.screeningExpYears,
          interviewQuestions: generateInterviewQuestions(
            a.screeningMissing ? a.screeningMissing.split(', ').filter(Boolean) : [],
            job?.title || 'posisi yang dilamar'
          )
        })
      }
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.post('/', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const data = await c.req.json()
    const { name, email, phone, source, status, job_id } = data

    if (!name || !email) {
      return c.json({ error: 'Nama dan email wajib diisi' }, 400)
    }

    const targetJobId = job_id || 1
    // Verify job belongs to this org
    const jobExists = await db.select().from(jobs).where(and(eq(jobs.id, targetJobId), eq(jobs.organizationId, orgId))).get()
    if (!jobExists) {
      return c.json({ error: 'Invalid job for this organization' }, 400)
    }

    const now = new Date().toISOString()
    const inserted = await db.insert(applicants).values({
      organizationId: orgId,
      jobId: targetJobId,
      name,
      email,
      phone: phone || '',
      source: source || 'JobStreet',
      status: status || 'Applied',
      createdAt: now,
      updatedAt: now
    }).returning().get()

    await db.insert(activities).values({
      organizationId: orgId,
      applicantId: inserted.id,
      type: 'status_change',
      description: `HR Admin menambahkan kandidat ${inserted.name} pada status ${inserted.status}`,
      user: 'HR Admin',
      timestamp: now
    })

    return c.json({
      id: inserted.id,
      organization_id: inserted.organizationId,
      job_id: inserted.jobId,
      name: inserted.name,
      email: inserted.email,
      phone: inserted.phone,
      source: inserted.source,
      status: inserted.status,
      created_at: inserted.createdAt
    }, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.patch('/:id/status', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const { status } = await c.req.json()
    if (!status) return c.json({ error: 'Status is required' }, 400)

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    const now = new Date().toISOString()
    await db.update(applicants).set({
      status,
      updatedAt: now
    }).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))

    await db.insert(activities).values({
      organizationId: orgId,
      applicantId: id,
      type: 'status_change',
      description: `HR Admin memindahkan ${applicant.name} dari ${applicant.status} ke ${status}`,
      user: 'HR Admin',
      timestamp: now
    })

    return c.json({ success: true, id, status })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.patch('/:id/notes', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    const { text, author } = await c.req.json()
    if (!text || !text.trim()) return c.json({ error: 'Note text cannot be empty' }, 400)

    const now = new Date().toISOString()
    const insertedNote = await db.insert(notes).values({
      organizationId: orgId,
      applicantId: id,
      text: text.trim(),
      author: author || 'HR Admin',
      createdAt: now
    }).returning().get()

    await db.insert(activities).values({
      organizationId: orgId,
      applicantId: id,
      type: 'note',
      description: `${insertedNote.author} menambahkan catatan: "${insertedNote.text.slice(0, 50)}${insertedNote.text.length > 50 ? '...' : ''}"`,
      user: insertedNote.author || 'HR Admin',
      timestamp: now
    })

    return c.json({
      id: insertedNote.id,
      applicantId: insertedNote.applicantId,
      text: insertedNote.text,
      author: insertedNote.author,
      created_at: insertedNote.createdAt
    }, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.delete('/:id', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    await db.delete(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
    await deleteDocument(applicant.resumePath)
    return c.json({ success: true, id })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.get('/:id/activities', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    const appActivities = await db.select().from(activities).where(and(eq(activities.applicantId, id), eq(activities.organizationId, orgId))).orderBy(desc(activities.timestamp)).all()

    return c.json(appActivities.map(a => ({
      id: a.id,
      applicantId: a.applicantId,
      type: a.type,
      description: a.description,
      user: a.user,
      timestamp: a.timestamp
    })))
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
