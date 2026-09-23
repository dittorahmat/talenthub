import { Hono } from 'hono'
import { db } from '../db'
import { jobs, applicants, notes, activities } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

export const applicantsRouter = new Hono()

applicantsRouter.get('/:id/screening', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()
    const applicant = await db.select().from(applicants).where(eq(applicants.id, id)).get()
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
      matched: (applicant as any).screeningMatched ? (applicant as any).screeningMatched.split(', ').filter(Boolean) : [],
      missing: (applicant as any).screeningMissing ? (applicant as any).screeningMissing.split(', ').filter(Boolean) : [],
      expYears: (applicant as any).screeningExpYears,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(eq(applicants.id, id)).get()
    if (!applicant) return c.notFound()

    const job = await db.select().from(jobs).where(eq(jobs.id, applicant.jobId)).get()
    const appNotes = await db.select().from(notes).where(eq(notes.applicantId, id)).orderBy(desc(notes.createdAt)).all()
    const appActivities = await db.select().from(activities).where(eq(activities.applicantId, id)).orderBy(desc(activities.timestamp)).all()

    const a = applicant as any
    return c.json({
      id: applicant.id,
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
      screening_matched: a.screeningMatched ? a.screeningMatched.split(', ').filter(Boolean) : [],
      screening_missing: a.screeningMissing ? a.screeningMissing.split(', ').filter(Boolean) : [],
      screening_exp_years: a.screeningExpYears ?? null,
      job: job ? { id: job.id, title: job.title, location: job.location, remote: job.remote } : null,
      notes: appNotes.map(n => ({ id: n.id, applicantId: n.applicantId, text: n.text, author: n.author, created_at: n.createdAt })),
      activities: appActivities.map(a => ({ id: a.id, applicantId: a.applicantId, type: a.type, description: a.description, user: a.user, timestamp: a.timestamp }))
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const { name, email, phone, source, status, job_id } = data

    if (!name || !email) {
      return c.json({ error: 'Nama dan email wajib diisi' }, 400)
    }

    const now = new Date().toISOString()
    const inserted = await db.insert(applicants).values({
      jobId: job_id || 1,
      name,
      email,
      phone: phone || '',
      source: source || 'JobStreet',
      status: status || 'Applied',
      createdAt: now,
      updatedAt: now
    }).returning().get()

    await db.insert(activities).values({
      applicantId: inserted.id,
      type: 'status_change',
      description: `HR Admin menambahkan kandidat ${inserted.name} pada status ${inserted.status}`,
      user: 'HR Admin',
      timestamp: now
    })

    return c.json({
      id: inserted.id,
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
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const { status } = await c.req.json()
    if (!status) return c.json({ error: 'Status is required' }, 400)

    const applicant = await db.select().from(applicants).where(eq(applicants.id, id)).get()
    if (!applicant) return c.notFound()

    const now = new Date().toISOString()
    await db.update(applicants).set({
      status,
      updatedAt: now
    }).where(eq(applicants.id, id))

    await db.insert(activities).values({
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
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const { text, author } = await c.req.json()
    if (!text || !text.trim()) return c.json({ error: 'Note text cannot be empty' }, 400)

    const now = new Date().toISOString()
    const insertedNote = await db.insert(notes).values({
      applicantId: id,
      text: text.trim(),
      author: author || 'HR Admin',
      createdAt: now
    }).returning().get()

    await db.insert(activities).values({
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
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(eq(applicants.id, id)).get()
    if (!applicant) return c.notFound()

    await db.delete(applicants).where(eq(applicants.id, id))
    return c.json({ success: true, id })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

applicantsRouter.get('/:id/activities', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const appActivities = await db.select().from(activities).where(eq(activities.applicantId, id)).orderBy(desc(activities.timestamp)).all()

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
