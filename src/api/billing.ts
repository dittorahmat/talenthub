import { Hono } from 'hono'
import { OrgEnv } from '../middleware/orgContext'
import { db } from '../db'
import { paymentInvoices } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { addCredit, getWallet } from '../services/walletService'
import { createHmac, timingSafeEqual } from 'node:crypto'

const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature'

function getWebhookSecret(): string | null {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim()
  return secret ? secret : null
}

if (process.env.NODE_ENV === 'production' && !getWebhookSecret()) {
  console.error('[billing] PAYMENT_WEBHOOK_SECRET is not configured. Settlement callbacks will be rejected.')
}

function isValidWebhookSignature(rawBody: string, provided: string | undefined, secret: string): boolean {
  if (!provided) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const normalized = provided.startsWith('sha256=') ? provided.slice('sha256='.length) : provided
  if (expected.length !== normalized.length) return false
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(normalized, 'utf8'))
}

export interface CreditPackage {
  id: 'starter' | 'growth' | 'enterprise'
  name: string
  credits: number
  priceIdr: number
  unitPriceIdr: number
  tag?: string
  description: string
  features: string[]
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    priceIdr: 250000,
    unitPriceIdr: 2500,
    description: 'Cocok untuk rekrutmen tim kecil dan eksplorasi fitur CV screening instan.',
    features: [
      '100 Kredit Screening AI',
      'Akses Talent Intelligence & Ranking',
      'Ekspor Hasil Screening PDF/CSV',
      'Masa aktif kredit selamanya',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    credits: 500,
    priceIdr: 1000000,
    unitPriceIdr: 2000,
    tag: 'Paling Populer',
    description: 'Solusi optimal bagi HR & Perusahaan berkembang dengan volume pelamar aktif.',
    features: [
      '500 Kredit Screening AI',
      'Prioritas Pemrosesan Batch CV',
      'Fitur Knockout Questions Kustom',
      'Multi-User Team Collab',
      'Hemat 20% dibanding Starter',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 2500,
    priceIdr: 3750000,
    unitPriceIdr: 1500,
    tag: 'Nilai Terbaik',
    description: 'Kapasitas skala besar untuk talent acquisition korporasi dan high-volume hiring.',
    features: [
      '2.500 Kredit Screening AI',
      'Dedicated LLM Pipeline Queue',
      'Integrasi WhatsApp & Email Otomatis',
      'Custom Screening Rubric & SLA Support',
      'Hemat 40% per kredit',
    ],
  },
]

export const billingRouter = new Hono<OrgEnv>()

// GET /api/billing/packages
billingRouter.get('/packages', (c) => {
  return c.json({
    packages: CREDIT_PACKAGES,
  })
})

// GET /api/billing/invoices - get list of invoices for the organization
billingRouter.get('/invoices', async (c) => {
  const orgId = c.get('orgId')
  const invoices = await db
    .select()
    .from(paymentInvoices)
    .where(eq(paymentInvoices.organizationId, orgId))
    .orderBy(desc(paymentInvoices.createdAt))
    .limit(20)
    .all()

  return c.json({ invoices })
})

// GET /api/billing/invoice/:invoiceId - get specific invoice for the caller's organization
billingRouter.get('/invoice/:invoiceId', async (c) => {
  const orgId = c.get('orgId')
  const invoiceId = c.req.param('invoiceId')
  const invoice = await db
    .select()
    .from(paymentInvoices)
    .where(and(eq(paymentInvoices.id, invoiceId), eq(paymentInvoices.organizationId, orgId)))
    .get()

  if (!invoice) {
    return c.json({ error: 'Invoice tidak ditemukan' }, 404)
  }

  return c.json({ invoice })
})

// POST /api/billing/checkout
billingRouter.post('/checkout', async (c) => {
  const orgId = c.get('orgId')
  const body = await c.req.json().catch(() => ({}))
  const { packageId, paymentMethod } = body

  const selectedPkg = CREDIT_PACKAGES.find((p) => p.id === packageId)
  if (!selectedPkg) {
    return c.json({ error: 'Paket kredit tidak valid' }, 400)
  }

  const validMethods = ['qris', 'va_bca', 'va_mandiri']
  if (!validMethods.includes(paymentMethod)) {
    return c.json({ error: 'Metode pembayaran tidak didukung' }, 400)
  }

  const now = new Date()
  const invoiceId = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  // Expiry: 24 hours from now
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  const nowIso = now.toISOString()

  let paymentCode = ''
  if (paymentMethod === 'qris') {
    // Standard mock QRIS payload string format
    paymentCode = `00020101021226670016ID.CO.MUDITA.WWW01189360099900000000010215${invoiceId}520458125303360540${selectedPkg.priceIdr}5802ID5914MUDITA TALENT6007JAKARTA6304`
  } else if (paymentMethod === 'va_bca') {
    paymentCode = `80777${Math.floor(10000000 + Math.random() * 90000000)}`
  } else if (paymentMethod === 'va_mandiri') {
    paymentCode = `88908${Math.floor(10000000 + Math.random() * 90000000)}`
  }

  const newInvoice = {
    id: invoiceId,
    organizationId: orgId,
    packageId: selectedPkg.id,
    packageName: selectedPkg.name,
    credits: selectedPkg.credits,
    amountIdr: selectedPkg.priceIdr,
    paymentMethod,
    paymentCode,
    status: 'PENDING',
    provider: 'mock_midtrans',
    paidAt: null,
    expiresAt,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  await db.insert(paymentInvoices).values(newInvoice)

  return c.json({
    success: true,
    invoice: newInvoice,
  })
})

/**
 * Common logic to settle invoice and add credits idempotently.
 *
 * The transition PENDING -> PAID is a single conditional UPDATE, so two
 * concurrent callbacks can never both grant credits. Only the Drizzle query
 * builder is used, so this runs unchanged on Cloudflare D1.
 */
async function processInvoiceSettlement(invoiceId: string) {
  const invoiceList = await db
    .select()
    .from(paymentInvoices)
    .where(eq(paymentInvoices.id, invoiceId))
    .all()

  const invoice = invoiceList[0]
  if (!invoice) {
    throw new Error('Invoice not found')
  }

  if (invoice.status === 'PAID') {
    const wallet = await getWallet(invoice.organizationId)
    return {
      status: 'success',
      message: 'Invoice already processed (idempotent)',
      invoiceId: invoice.id,
      balance: wallet.balance,
      creditsAdded: 0,
    }
  }

  const nowIso = new Date().toISOString()
  const claimedInvoices = await db
    .update(paymentInvoices)
    .set({ status: 'PAID', paidAt: nowIso, updatedAt: nowIso })
    .where(and(eq(paymentInvoices.id, invoiceId), eq(paymentInvoices.status, 'PENDING')))
    .returning()
    .all()

  if (claimedInvoices.length === 0) {
    const currentList = await db
      .select()
      .from(paymentInvoices)
      .where(eq(paymentInvoices.id, invoiceId))
      .all()
    const current = currentList[0]
    if (!current) {
      throw new Error('Invoice not found')
    }
    if (current.status === 'PAID') {
      const wallet = await getWallet(current.organizationId)
      return {
        status: 'success',
        message: 'Invoice already processed (idempotent)',
        invoiceId: current.id,
        balance: wallet.balance,
        creditsAdded: 0,
      }
    }
    throw new Error(`Invoice tidak dapat diselesaikan dari status ${current.status}`)
  }

  const settledInvoice = claimedInvoices[0]

  const addRes = await addCredit(
    settledInvoice.organizationId,
    settledInvoice.credits,
    'PURCHASE',
    `Pembelian paket kredit: ${settledInvoice.packageName} (${settledInvoice.credits} Kredit)`,
  )

  return {
    status: 'success',
    invoiceId: settledInvoice.id,
    balance: addRes.newBalance,
    creditsAdded: settledInvoice.credits,
    transaction: addRes.transaction,
  }
}

// POST /api/billing/webhook
billingRouter.post('/webhook', async (c) => {
  const secret = getWebhookSecret()
  if (!secret) {
    return c.json({ error: 'Webhook pembayaran belum dikonfigurasi' }, 503)
  }

  const rawBody = await c.req.text()
  const signature = c.req.header(WEBHOOK_SIGNATURE_HEADER)
  if (!isValidWebhookSignature(rawBody, signature, secret)) {
    return c.json({ error: 'Signature webhook tidak valid' }, 401)
  }

  let payload: Record<string, any>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.json({ error: 'Payload webhook tidak valid' }, 400)
  }

  // Support Midtrans format (order_id, transaction_status) or Xendit format (external_id, status)
  const invoiceId = payload.order_id || payload.external_id || payload.invoiceId
  const status = (payload.transaction_status || payload.status || '').toUpperCase()

  if (!invoiceId) {
    return c.json({ error: 'Missing invoice identification in webhook' }, 400)
  }

  // Standard success statuses across Midtrans & Xendit
  const isPaid = ['SETTLEMENT', 'CAPTURE', 'PAID', 'SUCCESS', 'COMPLETED'].includes(status)

  if (!isPaid) {
    // If pending or other status, acknowledge without crediting
    return c.json({ status: 'received', message: `Status is ${status}, no action taken` })
  }

  try {
    const invoice = await db
      .select()
      .from(paymentInvoices)
      .where(eq(paymentInvoices.id, invoiceId))
      .get()

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404)
    }

    if (payload.gross_amount !== undefined) {
      const grossAmount = Number(payload.gross_amount)
      if (!Number.isFinite(grossAmount) || Math.round(grossAmount) !== invoice.amountIdr) {
        return c.json({ error: 'Nominal pembayaran tidak sesuai dengan invoice' }, 400)
      }
    }

    const result = await processInvoiceSettlement(invoiceId)
    return c.json(result)
  } catch (err: any) {
    if (err.message === 'Invoice not found') {
      return c.json({ error: 'Invoice not found' }, 404)
    }
    return c.json({ error: err.message || 'Failed to process webhook' }, 500)
  }
})

// POST /api/billing/simulate-pay/:invoiceId
// Local-only helper. It is disabled unless explicitly enabled, so no deployed
// surface can mark an invoice paid without a verified provider callback.
billingRouter.post('/simulate-pay/:invoiceId', async (c) => {
  if (process.env.PAYMENT_SIMULATION_ENABLED !== 'true') {
    return c.json({ error: 'Not found' }, 404)
  }

  const invoiceId = c.req.param('invoiceId')

  try {
    const result = await processInvoiceSettlement(invoiceId)
    return c.json(result)
  } catch (err: any) {
    if (err.message === 'Invoice not found') {
      return c.json({ error: 'Invoice not found' }, 404)
    }
    return c.json({ error: err.message || 'Payment simulation failed' }, 500)
  }
})
