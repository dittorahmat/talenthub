import { Hono } from 'hono'
import { db } from '../db'
import { organizations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { OrgEnv } from '../middleware/orgContext'

export const organizationsRouter = new Hono<OrgEnv>()

organizationsRouter.get('/', async (c) => {
  try {
    const list = await db.select().from(organizations).all()
    return c.json(list)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

organizationsRouter.get('/current', async (c) => {
  try {
    const orgId = c.get('orgId') || 1
    const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).get()
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404)
    }
    return c.json(org)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
