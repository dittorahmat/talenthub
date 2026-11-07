import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { initCloudflareD1 } from './db'
import { initDocumentStorage } from './services/documentStorage'
import { candidateIntakeService, CloudflareQueueAdapter } from './services/candidateIntakeService'
import { DEFAULT_WORKER_ORIGIN, resolveAllowedOrigins } from './config/origins'
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

const ALLOWED_ORIGINS = resolveAllowedOrigins(process.env.APP_ORIGIN, DEFAULT_WORKER_ORIGIN)

app.use('*', cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
}))
app.use('*', async (c, next) => {
  if (c.env?.DB) {
    initCloudflareD1(c.env.DB)
  }
  if (c.env?.CV_STORAGE) {
    initDocumentStorage(c.env.CV_STORAGE)
  }
  if (c.env?.CV_QUEUE) {
    candidateIntakeService.setQueuePort(new CloudflareQueueAdapter(c.env.CV_QUEUE))
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
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api') && env.ASSETS) {
      return env.ASSETS.fetch(request)
    }
    return app.fetch(request, env, ctx)
  },
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    if (env.DB) {
      initCloudflareD1(env.DB)
    }
    if (env.CV_STORAGE) {
      initDocumentStorage(env.CV_STORAGE)
    }
    if (env.CV_QUEUE) {
      candidateIntakeService.setQueuePort(new CloudflareQueueAdapter(env.CV_QUEUE))
    }
    console.log(`[Cloudflare Queue Worker] Received batch of ${batch.messages.length} messages`)
    for (const message of batch.messages) {
      try {
        console.log(`Processing message ${message.id}:`, message.body)
        await candidateIntakeService.consumeQueueMessage(message.body)
        message.ack()
      } catch (err) {
        console.error(`Error processing queue message ${message.id}:`, err)
        message.retry()
      }
    }
  }
}
