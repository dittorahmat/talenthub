import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { getSessionFromRequest, type SerializedUser } from '../api/auth'

export type OrgEnv = {
  Variables: {
    orgId: number
    user: SerializedUser
  }
}

/**
 * Enforces fail-closed tenancy context extraction.
 * Guarantees a validated non-null orgId and authenticated user, throwing
 * an HTTPException (401 or 403) if the tenant context is absent or invalid.
 */
export function requireTenant(c: Context<OrgEnv>): { orgId: number; user: SerializedUser } {
  const orgId = c.get('orgId')
  const user = c.get('user')

  if (!user) {
    throw new HTTPException(401, {
      res: c.json({ error: 'Unauthorized' }, 401),
    })
  }

  if (!orgId || typeof orgId !== 'number' || orgId <= 0) {
    throw new HTTPException(403, {
      res: c.json({ error: 'Forbidden: akun tidak terhubung ke organisasi' }, 403),
    })
  }

  return { orgId, user }
}

/**
 * Routes that are intentionally reachable without a session.
 * Everything else requires an authenticated user and derives the tenant from
 * that user's membership — never from a caller-supplied header.
 */
const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/api\/health$/,
  /^\/api\/auth(\/|$)/,
  /^\/api\/onboarding(\/|$)/,
  /^\/api\/billing\/packages$/,
  /^\/api\/billing\/webhook$/,
  /^\/api\/applicants\/public(\/|$)/,
  /^\/api\/public\/careers(\/|$)/,
  /^\/api\/superadmin(\/|$)/,
]

export function isPublicApiRoute(path: string): boolean {
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(path))
}

export const orgMiddleware = createMiddleware<OrgEnv>(async (c, next) => {
  if (isPublicApiRoute(c.req.path)) {
    await next()
    return
  }

  const auth = await getSessionFromRequest(c)
  if (!auth) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const sessionOrgId = auth.user.organizationId
  if (!sessionOrgId) {
    return c.json({ error: 'Forbidden: akun tidak terhubung ke organisasi' }, 403)
  }

  const headerValue = c.req.header('x-organization-id')
  if (headerValue !== undefined && headerValue.trim() !== '') {
    const requestedOrgId = Number.parseInt(headerValue, 10)
    if (Number.isNaN(requestedOrgId) || requestedOrgId !== sessionOrgId) {
      return c.json({ error: 'Forbidden: organisasi tidak sesuai dengan sesi' }, 403)
    }
  }

  c.set('orgId', sessionOrgId)
  c.set('user', auth.user)
  await next()
})
