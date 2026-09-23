import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { jobsRouter } from './api/jobs'
import { applicantsRouter } from './api/applicants'
import { whatsappRouter } from './api/whatsapp'
import { resumeRouter } from './api/resume'
import { inboxRouter } from './api/inbox'
import { assistantRouter } from './api/assistant'

const app = new Hono()

app.use('*', cors({ origin: ['http://localhost:5173'], credentials: true }))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

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