import { Hono } from 'hono'
import { db } from '../db'
import { jobs, applicants } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { OrgEnv, requireTenant } from '../middleware/orgContext'
import { BatchQueueService } from '../services/batchQueueService'

export const jobsRouter = new Hono<OrgEnv>()

jobsRouter.get('/', async (c) => {
  try {
    const { orgId } = requireTenant(c)
    const allJobs = await db.select().from(jobs).where(eq(jobs.organizationId, orgId)).all()
    const allApplicants = await db.select().from(applicants).where(eq(applicants.organizationId, orgId)).all()

    const jobsWithCounts = allJobs.map(job => {
      const jobApplicants = allApplicants.filter(a => a.jobId === job.id)
      let parsedStages = null
      if (job.pipelineStages) {
        try {
          parsedStages = JSON.parse(job.pipelineStages)
        } catch {}
      }
      return {
        id: job.id,
        organization_id: job.organizationId,
        title: job.title,
        location: job.location,
        remote: job.remote,
        posted_at: job.postedAt,
        pipeline_stages: parsedStages,
        auto_screen_public: Boolean(job.autoScreenPublic),
        daily_public_screening_cap: job.dailyPublicScreeningCap,
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
    const { orgId } = requireTenant(c)
    const body = await c.req.json()
    const { title, location, remote, posted_at } = body
    if (!title || !location) {
      return c.json({ error: 'Title and location are required' }, 400)
    }

    const postedAtDate = posted_at || new Date().toISOString().split('T')[0]
    let serializedStages: string | null = null
    if (body.pipeline_stages && Array.isArray(body.pipeline_stages)) {
      serializedStages = JSON.stringify(body.pipeline_stages)
    }

    const inserted = await db.insert(jobs).values({
      organizationId: orgId,
      title,
      location,
      remote: remote || 'No',
      postedAt: postedAtDate,
      pipelineStages: serializedStages,
      autoScreenPublic: body.auto_screen_public ? true : false,
      dailyPublicScreeningCap: typeof body.daily_public_screening_cap === 'number' ? body.daily_public_screening_cap : 20,
    }).returning().get()

    let parsedStages = null
    if (inserted.pipelineStages) {
      try {
        parsedStages = JSON.parse(inserted.pipelineStages)
      } catch {}
    }

    return c.json({
      id: inserted.id,
      organization_id: inserted.organizationId,
      title: inserted.title,
      location: inserted.location,
      remote: inserted.remote,
      posted_at: inserted.postedAt,
      pipeline_stages: parsedStages,
      auto_screen_public: Boolean(inserted.autoScreenPublic),
      daily_public_screening_cap: inserted.dailyPublicScreeningCap,
      applicantCount: 0
    }, 201)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

jobsRouter.put('/:id', async (c) => {
  try {
    const { orgId } = requireTenant(c)
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const existing = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))
    if (!existing[0]) return c.notFound()

    const body = await c.req.json().catch(() => ({}))
    const updateData: Partial<typeof jobs.$inferInsert> = {}

    if (body.title && typeof body.title === 'string') updateData.title = body.title.trim()
    if (body.location && typeof body.location === 'string') updateData.location = body.location.trim()
    if (body.remote) updateData.remote = body.remote
    if (body.pipeline_stages !== undefined) {
      updateData.pipelineStages = Array.isArray(body.pipeline_stages) ? JSON.stringify(body.pipeline_stages) : null
    }
    if (body.auto_screen_public !== undefined) {
      updateData.autoScreenPublic = Boolean(body.auto_screen_public)
    }
    if (typeof body.daily_public_screening_cap === 'number') {
      updateData.dailyPublicScreeningCap = body.daily_public_screening_cap
    }

    const updated = await db
      .update(jobs)
      .set(updateData)
      .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))
      .returning()

    const job = updated[0]
    let parsedStages = null
    if (job.pipelineStages) {
      try {
        parsedStages = JSON.parse(job.pipelineStages)
      } catch {}
    }

    return c.json({
      id: job.id,
      organization_id: job.organizationId,
      title: job.title,
      location: job.location,
      remote: job.remote,
      posted_at: job.postedAt,
      pipeline_stages: parsedStages,
      auto_screen_public: Boolean(job.autoScreenPublic),
      daily_public_screening_cap: job.dailyPublicScreeningCap,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

jobsRouter.delete('/:id', async (c) => {
  try {
    const { orgId } = requireTenant(c)
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const job = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId))).get()
    if (!job) return c.notFound()

    await BatchQueueService.deleteJobDocuments(id)
    await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))
    return c.json({ success: true, id })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

jobsRouter.get('/:id', async (c) => {
  try {
    const { orgId } = requireTenant(c)
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.notFound()

    const job = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId))).get()
    if (!job) return c.notFound()

    const jobApplicants = await db.select().from(applicants).where(and(eq(applicants.jobId, id), eq(applicants.organizationId, orgId))).all()

    const mappedApplicants = jobApplicants.map(a => {
      const ap = a as any
      return {
        id: a.id,
        organization_id: a.organizationId,
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
        screening_verdict: ap.screeningVerdict ?? null,
        screening_matched: ap.screeningMatched ? ap.screeningMatched.split(', ').filter(Boolean) : [],
        screening_missing: ap.screeningMissing ? ap.screeningMissing.split(', ').filter(Boolean) : [],
        screening_exp_years: ap.screeningExpYears ?? null,
      }
    })

    let parsedStages = null
    if (job.pipelineStages) {
      try {
        parsedStages = JSON.parse(job.pipelineStages)
      } catch {}
    }

    return c.json({
      id: job.id,
      organization_id: job.organizationId,
      title: job.title,
      location: job.location,
      remote: job.remote,
      posted_at: job.postedAt,
      pipeline_stages: parsedStages,
      auto_screen_public: Boolean(job.autoScreenPublic),
      daily_public_screening_cap: job.dailyPublicScreeningCap,
      applicantCount: jobApplicants.length,
      applicants: mappedApplicants
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
