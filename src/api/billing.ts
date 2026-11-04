import { Hono } from 'hono'
import { OrgEnv } from '../middleware/orgContext'
import { db, sqlite } from '../db'
import { paymentInvoices } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { addCredit } from '../services/walletService'
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

// GET /api/billing/invoice/:invoiceId - get specific invoice
billingRouter.get('/invoice/:invoiceId', async (c) => {
  const invoiceId = c.req.param('invoiceId')
  const invoice = await db
    .select()
    .from(paymentInvoices)
    .where(eq(paymentInvoices.id, invoiceId))
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
 * Common logic to settle invoice and add credits idempotently
 */
async function processInvoiceSettlement(invoiceId: string) {
  // Use a transaction on sqlite to atomically check status, update to PAID, and add credit
  const tx = sqlite.transaction(() => {
    // 1. Get invoice with lock semantics in sqlite
    const invoiceStmt = sqlite.prepare(`SELECT * FROM payment_invoices WHERE id = ?`)
    const inv = invoiceStmt.get(invoiceId) as any

    if (!inv) {
      throw new Error('Invoice not found')
    }

    // 2. Check idempotency: If already paid, do NOT credit again
    if (inv.status === 'PAID') {
      // Get current balance
      const walletStmt = sqlite.prepare(`SELECT balance FROM credit_wallets WHERE organization_id = ?`)
      const wallet = walletStmt.get(inv.organization_id) as any
      return {
        alreadyPaid: true,
        invoice: inv,
        balance: wallet ? wallet.balance : 0,
      }
    }

    const nowIso = new Date().toISOString()

    // 3. Update invoice status to PAID
    const updateInvStmt = sqlite.prepare(`
      UPDATE payment_invoices 
      SET status = 'PAID', paid_at = ?, updated_at = ?
      WHERE id = ?
    `)
    updateInvStmt.run(nowIso, nowIso, invoiceId)

    return {
      alreadyPaid: false,
      invoice: { ...inv, status: 'PAID', paid_at: nowIso },
    }
  })

  const txResult = tx()

  if (txResult.alreadyPaid) {
    return {
      status: 'success',
      message: 'Invoice already processed (idempotent)',
      invoiceId: txResult.invoice.id,
      balance: txResult.balance,
      creditsAdded: 0,
    }
  }

  // 4. Add credit to wallet
  const addRes = await addCredit(
    txResult.invoice.organization_id,
    txResult.invoice.credits,
    'PURCHASE',
    `Pembelian paket kredit: ${txResult.invoice.package_name} (${txResult.invoice.credits} Kredit)`
  )

  return {
    status: 'success',
    invoiceId: txResult.invoice.id,
    balance: addRes.newBalance,
    creditsAdded: txResult.invoice.credits,
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
