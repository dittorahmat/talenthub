import { describe, it, expect, beforeAll } from 'bun:test'
import server from '../src/server'
import { getWallet, deductCredit, addCredit, getTransactions } from '../src/services/walletService'
import { db } from '../src/db'
import { creditWallets, creditTransactions, organizations } from '../src/db/schema'
import { eq } from 'drizzle-orm'

describe('Credit Wallet & Ledger Tests', () => {
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

  it('reads wallet balance per tenant via API GET /api/wallet', async () => {
    // Org 1 (Tech Satu Solusi)
    const res1 = await server.fetch(new Request('http://localhost:3001/api/wallet', {
      headers: { 'x-organization-id': '1' }
    }))
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.currency).toBe('CREDIT')
    expect(typeof data1.balance).toBe('number')
    expect(Array.isArray(data1.transactions)).toBe(true)

    // Org 2 (PT Sirius Global Technologies)
    const res2 = await server.fetch(new Request('http://localhost:3001/api/wallet', {
      headers: { 'x-organization-id': '2' }
    }))
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.currency).toBe('CREDIT')
    expect(typeof data2.balance).toBe('number')
    expect(Array.isArray(data2.transactions)).toBe(true)
  })

  it('performs atomic credit deduction and records transaction ledger', async () => {
    const orgId = 1
    // Reset or set a known balance
    const wallet = await getWallet(orgId)
    const initialBalance = wallet.balance

    // Deduct 5 credits
    const deductRes = await deductCredit(orgId, 5, 'CV_SCREENING', 'Screening candidate Andi Putra')
    expect(deductRes.success).toBe(true)
    expect(deductRes.newBalance).toBe(initialBalance - 5)
    expect(deductRes.transaction.amount).toBe(-5)
    expect(deductRes.transaction.type).toBe('CV_SCREENING')
    expect(deductRes.transaction.balanceAfter).toBe(initialBalance - 5)

    // Check ledger contains this transaction
    const txs = await getTransactions(orgId, 5)
    expect(txs.length).toBeGreaterThan(0)
    expect(txs[0].description).toBe('Screening candidate Andi Putra')
    expect(txs[0].amount).toBe(-5)
  })

  it('prevents overdraft via atomic conditional update when balance < amount', async () => {
    const orgId = 1
    const wallet = await getWallet(orgId)
    const excessiveAmount = wallet.balance + 1000

    // Should throw Insufficient credit balance
    expect(
      deductCredit(orgId, excessiveAmount, 'CV_SCREENING', 'Attempted excessive screening')
    ).rejects.toThrow('Insufficient credit balance')

    // Balance should remain unchanged
    const walletAfter = await getWallet(orgId)
    expect(walletAfter.balance).toBe(wallet.balance)
  })

  it('allows adding credit and verifies updated balance', async () => {
    const orgId = 1
    const wallet = await getWallet(orgId)
    const initialBalance = wallet.balance

    const addRes = await addCredit(orgId, 100, 'PURCHASE', 'Top up 100 credits')
    expect(addRes.success).toBe(true)
    expect(addRes.newBalance).toBe(initialBalance + 100)
    expect(addRes.transaction.amount).toBe(100)
    expect(addRes.transaction.type).toBe('PURCHASE')

    // Verify GET /api/wallet reflects addition
    const res = await server.fetch(new Request('http://localhost:3001/api/wallet', {
      headers: { 'x-organization-id': '1' }
    }))
    const data = await res.json()
    expect(data.balance).toBe(initialBalance + 100)
  })

  it('supports mock topup API endpoint POST /api/wallet/topup', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/wallet/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': '2',
      },
      body: JSON.stringify({ amount: 50, description: 'Test Topup 50' }),
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.transaction.amount).toBe(50)
  })
})
