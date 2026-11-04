import { describe, it, expect, beforeAll } from 'bun:test'
import server from '../src/server'
import { getWallet, deductCredit } from '../src/services/walletService'
import { db } from '../src/db'
import { organizations, paymentInvoices } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { createHmac } from 'node:crypto'
import { sessionHeadersFor } from './helpers/auth'

const WEBHOOK_SECRET = 'test-webhook-secret'
process.env.PAYMENT_WEBHOOK_SECRET = WEBHOOK_SECRET
process.env.PAYMENT_SIMULATION_ENABLED = 'true'

function signWebhook(body: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
}

const org1Headers = await sessionHeadersFor(1)
const org2Headers = await sessionHeadersFor(2)

describe('Payment Gateway Credit Top-up Integration Tests', () => {
  beforeAll(async () => {
    // Ensure orgs exist
    const orgs = await db.select().from(organizations).all()
    if (orgs.length === 0) {
      const now = new Date().toISOString()
      await db.insert(organizations).values([
        { id: 1, name: 'Tech Satu Solusi', slug: 'tech-satu-solusi', createdAt: now },
        { id: 2, name: 'PT Sirius Global Technologies', slug: 'sirius-global', createdAt: now },
      ])
    }
  })

  it('fetches credit packages list via GET /api/billing/packages', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/billing/packages', {
      headers: org1Headers,
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.packages)).toBe(true)
    expect(data.packages.length).toBe(3)

    const starter = data.packages.find((p: any) => p.id === 'starter')
    expect(starter).toBeDefined()
    expect(starter.credits).toBe(100)
    expect(starter.priceIdr).toBe(250000)

    const growth = data.packages.find((p: any) => p.id === 'growth')
    expect(growth).toBeDefined()
    expect(growth.credits).toBe(500)
    expect(growth.priceIdr).toBe(1000000)

    const enterprise = data.packages.find((p: any) => p.id === 'enterprise')
    expect(enterprise).toBeDefined()
    expect(enterprise.credits).toBe(2500)
    expect(enterprise.priceIdr).toBe(3750000)
  })

  it('creates checkout invoice for QRIS payment', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        packageId: 'growth',
        paymentMethod: 'qris',
      }),
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.invoice.id).toMatch(/^INV-\d{8}-[A-Z0-9]+$/)
    expect(data.invoice.packageId).toBe('growth')
    expect(data.invoice.packageName).toBe('Growth')
    expect(data.invoice.credits).toBe(500)
    expect(data.invoice.amountIdr).toBe(1000000)
    expect(data.invoice.paymentMethod).toBe('qris')
    expect(data.invoice.status).toBe('PENDING')
    expect(data.invoice.paymentCode.length).toBeGreaterThan(20)
  })

  it('creates checkout invoice for Virtual Account payment', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org2Headers,
      },
      body: JSON.stringify({
        packageId: 'starter',
        paymentMethod: 'va_bca',
      }),
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.invoice.packageId).toBe('starter')
    expect(data.invoice.paymentMethod).toBe('va_bca')
    expect(data.invoice.paymentCode).toMatch(/^80777\d+$/)
  })

  it('handles simulated payment and grants credits idempotently', async () => {
    const orgId = 1
    const initialWallet = await getWallet(orgId)
    const startBalance = initialWallet.balance

    // 1. Checkout
    const checkoutRes = await server.fetch(new Request('http://localhost:3001/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        packageId: 'starter',
        paymentMethod: 'qris',
      }),
    }))
    const checkoutData = await checkoutRes.json()
    const invoiceId = checkoutData.invoice.id

    // 2. Simulate Pay
    const payRes = await server.fetch(new Request(`http://localhost:3001/api/billing/simulate-pay/${invoiceId}`, {
      method: 'POST',
      headers: {
        ...org1Headers,
      },
    }))

    expect(payRes.status).toBe(200)
    const payData = await payRes.json()
    expect(payData.status).toBe('success')
    expect(payData.creditsAdded).toBe(100)
    expect(payData.balance).toBe(startBalance + 100)

    // Verify wallet updated
    const updatedWallet = await getWallet(orgId)
    expect(updatedWallet.balance).toBe(startBalance + 100)

    // 3. Re-simulate payment (idempotency test)
    const rePayRes = await server.fetch(new Request(`http://localhost:3001/api/billing/simulate-pay/${invoiceId}`, {
      method: 'POST',
      headers: {
        ...org1Headers,
      },
    }))
    expect(rePayRes.status).toBe(200)
    const rePayData = await rePayRes.json()
    expect(rePayData.creditsAdded).toBe(0)
    expect(rePayData.balance).toBe(startBalance + 100)

    // Wallet balance should NOT have changed again
    const walletAfterRePay = await getWallet(orgId)
    expect(walletAfterRePay.balance).toBe(startBalance + 100)
  })

  it('processes payment webhook in Midtrans & Xendit format idempotently', async () => {
    const orgId = 2
    const initialWallet = await getWallet(orgId)
    const startBalance = initialWallet.balance

    // Create invoice for 500 credits (Growth)
    const checkoutRes = await server.fetch(new Request('http://localhost:3001/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org2Headers,
      },
      body: JSON.stringify({
        packageId: 'growth',
        paymentMethod: 'va_mandiri',
      }),
    }))
    const checkoutData = await checkoutRes.json()
    const invoiceId = checkoutData.invoice.id

    // Webhook 1 (Midtrans style)
    const webhookBody = JSON.stringify({
      order_id: invoiceId,
      transaction_status: 'settlement',
      gross_amount: '1000000.00',
    })
    const webhookRes = await server.fetch(new Request('http://localhost:3001/api/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signWebhook(webhookBody),
      },
      body: webhookBody,
    }))

    expect(webhookRes.status).toBe(200)
    const webhookData = await webhookRes.json()
    expect(webhookData.status).toBe('success')
    expect(webhookData.creditsAdded).toBe(500)
    expect(webhookData.balance).toBe(startBalance + 500)

    // Webhook retry (Midtrans sends retry notifications)
    const webhookRetry = await server.fetch(new Request('http://localhost:3001/api/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signWebhook(webhookBody),
      },
      body: webhookBody,
    }))

    expect(webhookRetry.status).toBe(200)
    const retryData = await webhookRetry.json()
    expect(retryData.creditsAdded).toBe(0)
    expect(retryData.balance).toBe(startBalance + 500)

    // Wallet balance stays identical
    const finalWallet = await getWallet(orgId)
    expect(finalWallet.balance).toBe(startBalance + 500)
  })

  it('rejects unsigned and wrongly signed webhooks, leaving the invoice pending', async () => {
    const checkoutRes = await server.fetch(new Request('http://localhost:3001/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({ packageId: 'starter', paymentMethod: 'qris' }),
    }))
    const checkoutData = await checkoutRes.json()
    const invoiceId = checkoutData.invoice.id
    const body = JSON.stringify({
      order_id: invoiceId,
      transaction_status: 'settlement',
      gross_amount: '250000.00',
    })

    const unsigned = await server.fetch(new Request('http://localhost:3001/api/billing/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }))
    expect(unsigned.status).toBe(401)

    const wrongSignature = await server.fetch(new Request('http://localhost:3001/api/billing/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': 'deadbeef' },
      body,
    }))
    expect(wrongSignature.status).toBe(401)

    const invoice = await db
      .select()
      .from(paymentInvoices)
      .where(eq(paymentInvoices.id, invoiceId))
      .get()
    expect(invoice?.status).toBe('PENDING')
  })

  it('disables the payment simulation route unless explicitly enabled', async () => {
    const previous = process.env.PAYMENT_SIMULATION_ENABLED
    delete process.env.PAYMENT_SIMULATION_ENABLED
    try {
      const res = await server.fetch(new Request('http://localhost:3001/api/billing/simulate-pay/INV-TEST', {
        method: 'POST',
        headers: org1Headers,
      }))
      expect(res.status).toBe(404)
    } finally {
      process.env.PAYMENT_SIMULATION_ENABLED = previous
    }
  })

  it('keeps overdraft protection intact with new purchased balances', async () => {
    const orgId = 1
    const wallet = await getWallet(orgId)
    const currentBalance = wallet.balance

    // Attempting to deduct more than balance fails
    await expect(
      deductCredit(orgId, currentBalance + 50, 'CV_SCREENING', 'Overdraft attempt')
    ).rejects.toThrow('Insufficient credit balance')

    // Exact deduction succeeds
    const deductRes = await deductCredit(orgId, 10, 'CV_SCREENING', 'Valid screening deduction')
    expect(deductRes.success).toBe(true)
    expect(deductRes.newBalance).toBe(currentBalance - 10)
  })
})
