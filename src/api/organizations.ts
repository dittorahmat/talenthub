import { Hono } from 'hono'
import { db } from '../db'
import { organizations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { OrgEnv } from '../middleware/orgContext'

export const organizationsRouter = new Hono<OrgEnv>()

organizationsRouter.get('/', async (c) => {
  try {
    const orgId = c.get('orgId')
    const list = await db.select().from(organizations).where(eq(organizations.id, orgId)).all()
    if (list.length === 0) {
      return c.json({ error: 'Organization not found' }, 404)
    }
    return c.json(list)
  } catch {
    return c.json({ error: 'Gagal memuat organisasi' }, 500)
  }
})

organizationsRouter.get('/current', async (c) => {
  try {
    const orgId = c.get('orgId')
    const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).get()
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404)
    }
    return c.json(org)
  } catch {
    return c.json({ error: 'Gagal memuat organisasi' }, 500)
  }
})
