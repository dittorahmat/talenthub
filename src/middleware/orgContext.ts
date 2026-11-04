import { createMiddleware } from 'hono/factory'
import { getSessionFromRequest, type SerializedUser } from '../api/auth'

export type OrgEnv = {
  Variables: {
    orgId: number
    user: SerializedUser
  }
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
