import { Hono } from 'hono'
import { db } from '../db'
import { jobs, applicants, activities } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { OrgEnv } from '../middleware/orgContext'

export const whatsappRouter = new Hono<OrgEnv>()

// GET /api/whatsapp/:applicantId
whatsappRouter.get('/:applicantId', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const id = parseInt(c.req.param('applicantId'))
    if (isNaN(id)) return c.notFound()

    const applicant = await db.select().from(applicants).where(and(eq(applicants.id, id), eq(applicants.organizationId, orgId))).get()
    if (!applicant) return c.notFound()

    const job = await db.select().from(jobs).where(and(eq(jobs.id, applicant.jobId), eq(jobs.organizationId, orgId))).get()
    const jobTitle = job ? job.title : 'posisi yang dilamar'

    const phone = (applicant.phone || '').replace(/[\s\-+]/g, '')
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const msg = `Halo ${applicant.name}, ini pengingat interview Anda di TalentHub untuk posisi ${jobTitle} pada ${dateStr}. Silakan konfirmasi kehadirannya.`

    // Log activity
    await db.insert(activities).values({
      organizationId: orgId,
      applicantId: id,
      type: 'reminder_sent',
      description: `HR Admin mengirim pengingat WhatsApp kepada ${applicant.name}`,
      user: 'HR Admin',
      timestamp: new Date().toISOString()
    })

    return c.json({
      link: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      message: msg,
      phone
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
