import { describe, it, expect, beforeAll } from 'bun:test'
import server from '../src/server'
import { db } from '../src/db'
import { organizations } from '../src/db/schema'
import { sessionHeadersFor } from './helpers/auth'

const superadminHeaders = await sessionHeadersFor(1, 'superadmin')
const adminHeaders = await sessionHeadersFor(2, 'admin')

describe('Superadmin Ledger & Audit Integration Tests', () => {
  beforeAll(async () => {
    const orgs = await db.select().from(organizations)
    if (orgs.length === 0) {
      const now = new Date().toISOString()
      await db.insert(organizations).values([
        { id: 1, name: 'Tech Satu Solusi', slug: 'tech-satu-solusi', createdAt: now },
      ])
    }
  })

  it('rejects unauthorized access without a superadmin session', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview'))
    expect(res.status).toBe(403)
  })

  it('rejects a non-superadmin session', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview', {
      headers: adminHeaders,
    }))
    expect(res.status).toBe(403)
  })

  it('ignores the removed development bypass header', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview', {
      headers: { 'X-Superadmin-Key': 'dev-bypass' },
    }))
    expect(res.status).toBe(403)
  })

  it('provides overview including tenants, users, and recent audit logs for a superadmin session', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview', {
      headers: superadminHeaders,
    }))
    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(typeof data.totalTenants).toBe('number')
    expect(typeof data.totalUsers).toBe('number')
    expect(Array.isArray(data.organizations)).toBe(true)
    expect(Array.isArray(data.recentAuditLogs)).toBe(true)
  })

  it('injects credit with double-entry SUPERADMIN_ADJUSTMENT ledger mutation', async () => {
    const overviewRes = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview', {
      headers: superadminHeaders,
    }))
    const initialOverview: any = await overviewRes.json()
    const targetOrg = initialOverview.organizations[0]
    expect(targetOrg).toBeDefined()
    const previousBalance = targetOrg.balance

    const injectRes = await server.fetch(new Request('http://localhost:3001/api/superadmin/inject-credit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...superadminHeaders,
      },
      body: JSON.stringify({
        organizationId: targetOrg.id,
        amount: 50,
        note: 'Audit test: manual credit adjustment',
      }),
    }))
    expect(injectRes.status).toBe(200)
    const injectData: any = await injectRes.json()
    expect(injectData.success).toBe(true)
    expect(injectData.wallet.balance).toBe(previousBalance + 50)

    const updatedRes = await server.fetch(new Request('http://localhost:3001/api/superadmin/overview', {
      headers: superadminHeaders,
    }))
    const updatedOverview: any = await updatedRes.json()
    const latestAudit = updatedOverview.recentAuditLogs[0]
    expect(latestAudit).toBeDefined()
    expect(latestAudit.type).toBe('SUPERADMIN_ADJUSTMENT')
    expect(latestAudit.amount).toBe(50)
    expect(latestAudit.description).toContain('Audit test: manual credit adjustment')
  })
})
