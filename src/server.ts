import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { DEFAULT_DEV_ORIGIN, resolveAllowedOrigins } from './config/origins'
import { orgMiddleware } from './middleware/orgContext'
import { jobsRouter } from './api/jobs'
import { applicantsRouter } from './api/applicants'
import { whatsappRouter } from './api/whatsapp'
import { resumeRouter } from './api/resume'
import { inboxRouter } from './api/inbox'
import { assistantRouter } from './api/assistant'
import { organizationsRouter } from './api/organizations'
import { walletRouter } from './api/wallet'
import { onboardingRouter } from './api/onboarding'
import { billingRouter } from './api/billing'
import { authRouter } from './api/auth'
import { superadminRouter } from './api/superadmin'

const app = new Hono()

const ALLOWED_ORIGINS = resolveAllowedOrigins(process.env.APP_ORIGIN, DEFAULT_DEV_ORIGIN)

app.use('*', cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
}))
app.use('/api/*', orgMiddleware)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.route('/api/auth', authRouter)
app.route('/api/superadmin', superadminRouter)
app.route('/api/organizations', organizationsRouter)
app.route('/api/wallet', walletRouter)
app.route('/api/onboarding', onboardingRouter)
app.route('/api/billing', billingRouter)
app.route('/api/jobs', jobsRouter)
app.route('/api/applicants', applicantsRouter)
app.route('/api/whatsapp', whatsappRouter)
app.route('/api/applicants', resumeRouter)
app.route('/api', inboxRouter)
app.route('/api/assistant', assistantRouter)

app.use('/uploads/*', serveStatic({ root: './public' }))
app.use('/*', serveStatic({ root: './dist' }))
app.get('*', serveStatic({ path: './dist/index.html' }))

const port = Number(process.env.PORT) || 3001
console.log(`Server running at http://localhost:${port}`)
export default { port, fetch: app.fetch }
