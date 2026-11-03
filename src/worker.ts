import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { initCloudflareD1 } from './db'
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

export interface Env {
  DB: D1Database
  CV_STORAGE: R2Bucket
  CV_QUEUE: Queue
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())
app.use('*', async (c, next) => {
  if (c.env?.DB) {
    initCloudflareD1(c.env.DB)
  }
  await next()
})
app.use('/api/*', orgMiddleware)

app.get('/api/health', (c) => c.json({
  status: 'ok',
  platform: 'Cloudflare Workers (workers.dev monolith)',
  timestamp: new Date().toISOString()
}))

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

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx)
  },
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    console.log(`[Cloudflare Queue Worker] Received batch of ${batch.messages.length} messages`)
    for (const message of batch.messages) {
      console.log(`Processing message ${message.id}:`, message.body)
      message.ack()
    }
  }
}
