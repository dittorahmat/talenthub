import { Hono } from 'hono'
import { db } from '../db'
import { jobs, applicants, notes, activities, candidateShareTokens, candidateScorecards, candidateNotes } from '../db/schema'
import { eq, desc, and, lt } from 'drizzle-orm'
import { OrgEnv, requireTenant } from '../middleware/orgContext'
import { generateInterviewQuestions, formatWhatsAppSummary } from '../utils/summaryExport'
import { deleteDocument, getDocument } from '../services/documentStorage'
import crypto from 'crypto'

export const applicantsRouter = new Hono<OrgEnv>()

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
  const { orgId } = requireTenant(c)
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.notFound()
  const applicantList = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
  const applicant = applicantList[0]
  if (!applicant) return c.notFound()

  // Opportunistically prune expired share tokens from Cloudflare D1
  try {
    await db
      .delete(candidateShareTokens)
      .where(lt(candidateShareTokens.expiresAt, new Date().toISOString()))
  } catch {}

  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  const createdAt = new Date().toISOString()

  await db.insert(candidateShareTokens).values({
    token,
    applicantId: id,
    organizationId: orgId,
    expiresAt,
    createdAt,
  })

  return c.json({
    token,
    shareUrl: `/share/candidate/${token}`,
    expiresAt,
  })
})

applicantsRouter.get('/public/share/:token', async (c) => {
  const token = c.req.param('token')
  const tokenRows = await db
    .select()
    .from(candidateShareTokens)
    .where(eq(candidateShareTokens.token, token))
  const entry = tokenRows[0]
  if (!entry || new Date(entry.expiresAt).getTime() < Date.now()) {
    return c.json({ error: 'Tautan telah kadaluarsa atau tidak valid' }, 404)
  }

  const applicantRows = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, entry.applicantId), eq(applicants.organizationId, entry.organizationId)))
  const applicant = applicantRows[0] as any
  if (!applicant) return c.notFound()
  const jobRows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, applicant.jobId), eq(jobs.organizationId, entry.organizationId)))
  const job = jobRows[0] as any

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
  const tokenRows = await db
    .select()
    .from(candidateShareTokens)
    .where(eq(candidateShareTokens.token, token))
  const entry = tokenRows[0]
  if (!entry || new Date(entry.expiresAt).getTime() < Date.now()) {
    return c.json({ error: 'Tautan telah kadaluarsa atau tidak valid' }, 404)
  }

  const applicantRows = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, entry.applicantId), eq(applicants.organizationId, entry.organizationId)))
  const applicant = applicantRows[0]
  if (!applicant || !applicant.resumePath) return c.notFound()

  const document = await getDocument(applicant.resumePath)
  if (!document) return c.notFound()

  return documentResponse(document, applicant.resumeFilename || `resume-${applicant.id}`)
})

applicantsRouter.get('/:id/resume', async (c) => {
  const { orgId } = requireTenant(c)
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
    const { orgId } = requireTenant(c)
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

// Trigger manual AI screening on an applicant (Ticket 05)
applicantsRouter.post('/:id/screen', async (c) => {
  try {
    const { orgId } = requireTenant(c)
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicantList = await db
      .select()
      .from(applicants)
      .where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
    const applicant = applicantList[0]
    if (!applicant) return c.notFound()

    if (!applicant.resumePath) {
      return c.json({ error: 'Kandidat belum memiliki berkas resume untuk di-screen' }, 400)
    }

    const doc = await getDocument(applicant.resumePath)
    if (!doc) {
      return c.json({ error: 'Berkas resume kandidat tidak ditemukan di storage' }, 404)
    }

    const { candidateIntakeService } = await import('../services/candidateIntakeService')
    const buffer = Buffer.from(doc.data)

    const intakeResult = await candidateIntakeService.submitSingleResume({
      orgId,
      jobId: applicant.jobId,
      applicantId: id,
      file: {
        filename: applicant.resumeFilename || 'resume.pdf',
        buffer,
      },
    })

    return c.json(intakeResult)
  } catch (err: any) {
    console.error('Manual screen error:', err)
    if (err.message === 'Insufficient credit balance' || err.code === 'INSUFFICIENT_CREDIT') {
      return c.json({ error: 'INSUFFICIENT_CREDIT', message: 'Saldo kredit tidak mencukupi untuk melakukan AI screening.' }, 402)
    }
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.get('/:id/summary', async (c) => {
  try {
    const { orgId } = requireTenant(c)
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
    const { orgId } = requireTenant(c)
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
    const { orgId } = requireTenant(c)
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
    const { orgId } = requireTenant(c)
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
    const { orgId } = requireTenant(c)
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
    const { orgId } = requireTenant(c)
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
    const { orgId } = requireTenant(c)
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

// --- Scorecards & Team Activity Notes (Ticket 02) ---

applicantsRouter.get('/:id/scorecards', async (c) => {
  const { orgId } = requireTenant(c)
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.notFound()

  const applicant = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
  if (!applicant[0]) return c.notFound()

  const scorecards = await db
    .select()
    .from(candidateScorecards)
    .where(and(eq(candidateScorecards.applicantId, id), eq(candidateScorecards.organizationId, orgId)))
    .orderBy(desc(candidateScorecards.createdAt))

  // Compute aggregate stats
  const count = scorecards.length
  let avgTechnical = 0
  let avgCulture = 0
  let avgCommunication = 0
  let avgOverall = 0

  if (count > 0) {
    avgTechnical = Number((scorecards.reduce((sum, s) => sum + s.technicalScore, 0) / count).toFixed(1))
    avgCulture = Number((scorecards.reduce((sum, s) => sum + s.cultureScore, 0) / count).toFixed(1))
    avgCommunication = Number((scorecards.reduce((sum, s) => sum + s.communicationScore, 0) / count).toFixed(1))
    avgOverall = Number(((avgTechnical + avgCulture + avgCommunication) / 3).toFixed(1))
  }

  return c.json({
    scorecards,
    aggregate: {
      count,
      avgTechnical,
      avgCulture,
      avgCommunication,
      avgOverall,
    },
  })
})

applicantsRouter.post('/:id/scorecards', async (c) => {
  const { orgId, user } = requireTenant(c)
  if (user.role === 'viewer') {
    return c.json({ error: 'Role viewer hanya memiliki akses baca (read-only)' }, 403)
  }
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.notFound()

  const applicant = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
  if (!applicant[0]) return c.notFound()

  const body = await c.req.json().catch(() => ({}))
  const { technicalScore, cultureScore, communicationScore, recommendation, notes: scorecardNotes } = body

  const tech = Number(technicalScore)
  const cult = Number(cultureScore)
  const comm = Number(communicationScore)

  if (!tech || tech < 1 || tech > 5 || !cult || cult < 1 || cult > 5 || !comm || comm < 1 || comm > 5) {
    return c.json({ error: 'Skor rubrik (technical, culture, communication) wajib berupa angka 1 s/d 5' }, 400)
  }

  const validRecs = ['Strong Yes', 'Yes', 'Neutral', 'No']
  if (!validRecs.includes(recommendation)) {
    return c.json({ error: 'Rekomendasi harus salah satu dari: Strong Yes, Yes, Neutral, No' }, 400)
  }

  const now = new Date().toISOString()
  const evaluatorId = String(user.id || 'evaluator')
  const evaluatorName = user.name || user.email || 'Interviewer'

  const inserted = await db.insert(candidateScorecards).values({
    applicantId: id,
    organizationId: orgId,
    evaluatorId,
    evaluatorName,
    technicalScore: tech,
    cultureScore: cult,
    communicationScore: comm,
    recommendation,
    notes: scorecardNotes ? String(scorecardNotes).trim() : null,
    createdAt: now,
    updatedAt: now,
  }).returning()

  // Log activity
  await db.insert(activities).values({
    organizationId: orgId,
    applicantId: id,
    type: 'SCORECARD_SUBMITTED',
    description: `${evaluatorName} memberikan evaluasi scorecard (${recommendation}, Skor Rata-rata ${((tech + cult + comm) / 3).toFixed(1)})`,
    user: evaluatorName,
    timestamp: now,
  })

  return c.json(inserted[0], 201)
})

applicantsRouter.get('/:id/team-notes', async (c) => {
  const { orgId } = requireTenant(c)
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.notFound()

  const applicant = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
  if (!applicant[0]) return c.notFound()

  const notesList = await db
    .select()
    .from(candidateNotes)
    .where(and(eq(candidateNotes.applicantId, id), eq(candidateNotes.organizationId, orgId)))
    .orderBy(desc(candidateNotes.createdAt))

  return c.json(notesList)
})

applicantsRouter.post('/:id/team-notes', async (c) => {
  const { orgId, user } = requireTenant(c)
  if (user.role === 'viewer') {
    return c.json({ error: 'Role viewer hanya memiliki akses baca (read-only)' }, 403)
  }
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.notFound()

  const applicant = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId)))
  if (!applicant[0]) return c.notFound()

  const body = await c.req.json().catch(() => ({}))
  const { content } = body

  if (!content || typeof content !== 'string' || !content.trim()) {
    return c.json({ error: 'Konten catatan tim wajib diisi' }, 400)
  }

  const now = new Date().toISOString()
  const authorId = String(user.id || 'author')
  const authorName = user.name || user.email || 'Tim Interviewer'

  const inserted = await db.insert(candidateNotes).values({
    applicantId: id,
    organizationId: orgId,
    authorId,
    authorName,
    content: content.trim(),
    createdAt: now,
  }).returning()

  return c.json(inserted[0], 201)
})

