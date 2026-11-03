import { describe, it, expect, beforeAll } from 'bun:test'
import server from '../src/server'
import { db } from '../src/db'
import { organizations, creditWallets } from '../src/db/schema'
import { eq } from 'drizzle-orm'

describe('Superadmin Ledger & Audit Integration Tests', () => {
  beforeAll(async () => {
    const orgs = await db.select().from(organizations)
    if (orgs.length === 0) {
      const now = new Date().toISOString()
      await db.insert(organizations).values([
        { id: 1, name: 'Tech Satu Solusi', slug: 'tech-satu-solusi', createdAt: now }
      ])
    }
  })

  it('rejects unauthorized access without superadmin credentials', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview'))
    expect(res.status).toBe(403)
  })

  it('provides overview including tenants, users, and recent audit logs with dev-bypass', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview', {
      headers: { 'X-Superadmin-Key': 'dev-bypass' }
    }))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(typeof data.totalTenants).toBe('number')
    expect(typeof data.totalUsers).toBe('number')
    expect(Array.isArray(data.organizations)).toBe(true)
    expect(Array.isArray(data.recentAuditLogs)).toBe(true)
  })

  it('injects credit with double-entry SUPERADMIN_ADJUSTMENT ledger mutation', async () => {
    // 1. Get initial balance
    const overviewRes = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview', {
      headers: { 'X-Superadmin-Key': 'dev-bypass' }
    }))
    const initialOverview: any = await overviewRes.json()
    const targetOrg = initialOverview.organizations[0]
    expect(targetOrg).toBeDefined()
    const previousBalance = targetOrg.balance

    // 2. Inject +50 credits
    const injectRes = await server.fetch(new Request('http://localhost:3001/api/superadmin/inject-credit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Superadmin-Key': 'dev-bypass'
      },
      body: JSON.stringify({
        organizationId: targetOrg.id,
        amount: 50,
        note: 'Audit test: manual credit adjustment'
      })
    }))
    expect(injectRes.status).toBe(200)
    const injectData: any = await injectRes.json()
    expect(injectData.success).toBe(true)
    expect(injectData.wallet.balance).toBe(previousBalance + 50)

    // 3. Verify in overview audit log
    const updatedRes = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview', {
      headers: { 'X-Superadmin-Key': 'dev-bypass' }
    }))
    const updatedOverview: any = await updatedRes.json()
    const latestAudit = updatedOverview.recentAuditLogs[0]
    expect(latestAudit).toBeDefined()
    expect(latestAudit.type).toBe('SUPERADMIN_ADJUSTMENT')
    expect(latestAudit.amount).toBe(50)
    expect(latestAudit.description).toContain('Audit test: manual credit adjustment')
  })
})
