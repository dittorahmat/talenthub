import { Hono } from 'hono'
import { db } from '../db'
import { outreachTemplates } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { OrgEnv, requireTenant } from '../middleware/orgContext'

export const templatesRouter = new Hono<OrgEnv>()

// List all templates for current tenant
templatesRouter.get('/', async (c) => {
  const { orgId } = requireTenant(c)
  const channel = c.req.query('channel') // optional filter: 'whatsapp' | 'email'

  let query = db
    .select()
    .from(outreachTemplates)
    .where(
      channel
        ? and(eq(outreachTemplates.organizationId, orgId), eq(outreachTemplates.channel, channel))
        : eq(outreachTemplates.organizationId, orgId)
    )
    .orderBy(desc(outreachTemplates.id))

  const items = await query
  return c.json(items)
})

// Create new template
templatesRouter.post('/', async (c) => {
  const { orgId } = requireTenant(c)
  const body = await c.req.json().catch(() => ({}))

  const { name, channel, subject, body: content } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return c.json({ error: 'Nama template wajib diisi' }, 400)
  }

  if (channel !== 'whatsapp' && channel !== 'email') {
    return c.json({ error: 'Channel harus berupa whatsapp atau email' }, 400)
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    return c.json({ error: 'Isi template wajib diisi' }, 400)
  }

  const now = new Date().toISOString()
  const result = await db.insert(outreachTemplates).values({
    organizationId: orgId,
    name: name.trim(),
    channel,
    subject: subject ? subject.trim() : null,
    body: content.trim(),
    createdAt: now,
    updatedAt: now,
  }).returning()

  return c.json(result[0], 201)
})

// Update template
templatesRouter.put('/:id', async (c) => {
  const { orgId } = requireTenant(c)
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'ID tidak valid' }, 400)

  const body = await c.req.json().catch(() => ({}))
  const { name, channel, subject, body: content } = body

  const existing = await db
    .select()
    .from(outreachTemplates)
    .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.organizationId, orgId)))

  if (!existing[0]) {
    return c.json({ error: 'Template tidak ditemukan' }, 404)
  }

  const updateData: Partial<typeof outreachTemplates.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  }

  if (name && typeof name === 'string') updateData.name = name.trim()
  if (channel === 'whatsapp' || channel === 'email') updateData.channel = channel
  if (subject !== undefined) updateData.subject = subject ? subject.trim() : null
  if (content && typeof content === 'string') updateData.body = content.trim()

  const updated = await db
    .update(outreachTemplates)
    .set(updateData)
    .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.organizationId, orgId)))
    .returning()

  return c.json(updated[0])
})

// Delete template
templatesRouter.delete('/:id', async (c) => {
  const { orgId } = requireTenant(c)
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'ID tidak valid' }, 400)

  const existing = await db
    .select()
    .from(outreachTemplates)
    .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.organizationId, orgId)))

  if (!existing[0]) {
    return c.json({ error: 'Template tidak ditemukan' }, 404)
  }

  await db
    .delete(outreachTemplates)
    .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.organizationId, orgId)))

  return c.json({ success: true, message: 'Template berhasil dihapus' })
})
