import { Hono } from 'hono'
import { db } from '../db'
import { jobs, applicants } from '../db/schema'
import { eq } from 'drizzle-orm'

export const jobsRouter = new Hono()

jobsRouter.get('/', async (c) => {
  try {
    const allJobs = await db.select().from(jobs).all()
    const allApplicants = await db.select().from(applicants).all()

    const jobsWithCounts = allJobs.map(job => {
      const jobApplicants = allApplicants.filter(a => a.jobId === job.id)
      return {
        id: job.id,
        title: job.title,
        location: job.location,
        remote: job.remote,
        posted_at: job.postedAt,
        applicantCount: jobApplicants.length
      }
    })

    return c.json(jobsWithCounts)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

jobsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { title, location, remote, posted_at } = body
    if (!title || !location) {
      return c.json({ error: 'Title and location are required' }, 400)
    }

    const postedAtDate = posted_at || new Date().toISOString().split('T')[0]
    const inserted = await db.insert(jobs).values({
      title,
      location,
      remote: remote || 'No',
      postedAt: postedAtDate
    }).returning().get()

    return c.json({
      id: inserted.id,
      title: inserted.title,
      location: inserted.location,
      remote: inserted.remote,
      posted_at: inserted.postedAt,
      applicantCount: 0
    }, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

jobsRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const job = await db.select().from(jobs).where(eq(jobs.id, id)).get()
    if (!job) return c.notFound()

    await db.delete(jobs).where(eq(jobs.id, id))
    return c.json({ success: true, id })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

jobsRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const job = await db.select().from(jobs).where(eq(jobs.id, id)).get()
    if (!job) return c.notFound()

    const jobApplicants = await db.select().from(applicants).where(eq(applicants.jobId, id)).all()

    const mappedApplicants = jobApplicants.map(a => {
      const ap = a as any
      return {
        id: a.id,
        job_id: a.jobId,
        name: a.name,
        email: a.email,
        phone: a.phone,
        source: a.source,
        status: a.status,
        resume_filename: a.resumeFilename,
        resume_keywords: a.resumeKeywords,
        created_at: a.createdAt,
        screening_status: ap.screeningStatus ?? 'pending',
        screening_summary: ap.screeningSummary ?? null,
        screening_score: ap.screeningScore ?? null,
        screening_band: ap.screeningBand ?? null,
        screening_matched: ap.screeningMatched ? ap.screeningMatched.split(', ').filter(Boolean) : [],
        screening_missing: ap.screeningMissing ? ap.screeningMissing.split(', ').filter(Boolean) : [],
        screening_exp_years: ap.screeningExpYears ?? null,
      }
    })

    return c.json({
      id: job.id,
      title: job.title,
      location: job.location,
      remote: job.remote,
      posted_at: job.postedAt,
      applicantCount: jobApplicants.length,
      applicants: mappedApplicants
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
