import { createMiddleware } from 'hono/factory'

export type OrgEnv = {
  Variables: {
    orgId: number
  }
}

export const orgMiddleware = createMiddleware<OrgEnv>(async (c, next) => {
  const headerVal = c.req.header('x-organization-id')
  let orgId = 1
  if (headerVal) {
    const parsed = parseInt(headerVal, 10)
    if (!isNaN(parsed) && parsed > 0) {
      orgId = parsed
    }
  }
  c.set('orgId', orgId)
  await next()
})
