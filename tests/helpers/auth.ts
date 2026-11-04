import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../../src/db'
import { organizations, session, user } from '../../src/db/schema'
import { SESSION_COOKIE_NAME } from '../../src/api/auth'

export interface TestSession {
  cookie: string
  userId: string
  organizationId: number
}

const tokenCache = new Map<string, string>()

async function ensureOrganization(orgId: number): Promise<void> {
  const existing = await db.select().from(organizations).where(eq(organizations.id, orgId)).get()
  if (existing) return
  await db.insert(organizations).values({
    id: orgId,
    name: `Test Organization ${orgId}`,
    slug: `test-organization-${orgId}`,
    createdAt: new Date().toISOString(),
  })
}

/**
 * Creates (or reuses) a real session row so integration tests exercise the
 * same session-based tenant resolution as the application.
 */
export async function createTestSession(
  orgId: number,
  role: 'admin' | 'superadmin' = 'admin',
): Promise<TestSession> {
  const cacheKey = `${orgId}:${role}`
  const cachedToken = tokenCache.get(cacheKey)
  if (cachedToken) {
    const existingSession = await db.select().from(session).where(eq(session.token, cachedToken)).get()
    if (existingSession && new Date(existingSession.expiresAt).getTime() > Date.now()) {
      return {
        cookie: `${SESSION_COOKIE_NAME}=${cachedToken}`,
        userId: existingSession.userId,
        organizationId: orgId,
      }
    }
  }

  await ensureOrganization(orgId)

  const userId = `usr_test_${orgId}_${role}`
  const email = `test-org-${orgId}-${role}@example.com`

  let existingUser = await db.select().from(user).where(eq(user.id, userId)).get()
  if (!existingUser) {
    existingUser = await db.select().from(user).where(eq(user.email, email)).get()
  }
  if (!existingUser) {
    existingUser = await db
      .insert(user)
      .values({
        id: userId,
        name: `Test ${role} ${orgId}`,
        email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        role,
        organizationId: orgId,
      })
      .returning()
      .get()
  } else if (existingUser.organizationId !== orgId || existingUser.role !== role) {
    await db
      .update(user)
      .set({ organizationId: orgId, role })
      .where(eq(user.id, existingUser.id))
  }

  const token = `test_${randomUUID().replace(/-/g, '')}`
  await db.insert(session).values({
    id: `sess_${randomUUID().replace(/-/g, '')}`,
    token,
    userId: existingUser.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'bun-test',
  })

  tokenCache.set(cacheKey, token)
  return { cookie: `${SESSION_COOKIE_NAME}=${token}`, userId: existingUser.id, organizationId: orgId }
}

export async function sessionHeadersFor(
  orgId: number,
  role: 'admin' | 'superadmin' = 'admin',
): Promise<Record<string, string>> {
  const { cookie } = await createTestSession(orgId, role)
  return { cookie }
}
