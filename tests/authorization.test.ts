import { describe, it, expect } from 'bun:test'
import server from '../src/server'
import { sessionHeadersFor } from './helpers/auth'

const org1Headers = await sessionHeadersFor(1)
const org2Headers = await sessionHeadersFor(2)

describe('Tenant-scoped read authorization', () => {
  it('rejects an unauthenticated organization directory request', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/organizations'))
    expect(res.status).toBe(401)
  })

  it('returns only the caller organization', async () => {
    const res = await server.fetch(new Request('http://localhost:3001/api/organizations', {
      headers: org1Headers,
    }))
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<{ id: number }>
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe(1)
  })

  it('does not disclose another organization invoice by id', async () => {
    const checkoutRes = await server.fetch(new Request('http://localhost:3001/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({ packageId: 'starter', paymentMethod: 'qris' }),
    }))
    const checkoutData = (await checkoutRes.json()) as { invoice: { id: string } }

    const forbidden = await server.fetch(
      new Request(`http://localhost:3001/api/billing/invoice/${checkoutData.invoice.id}`, {
        headers: org2Headers,
      }),
    )
    expect(forbidden.status).toBe(404)

    const allowed = await server.fetch(
      new Request(`http://localhost:3001/api/billing/invoice/${checkoutData.invoice.id}`, {
        headers: org1Headers,
      }),
    )
    expect(allowed.status).toBe(200)
  })

  it('binds assistant leave requests to their owner', async () => {
    const unauth = await server.fetch(new Request('http://localhost:3001/api/assistant/requests'))
    expect(unauth.status).toBe(401)

    const created = await server.fetch(new Request('http://localhost:3001/api/assistant/leave', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        type: 'sakit',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        note: 'catatan pribadi pemilik',
      }),
    }))
    expect(created.status).toBe(201)

    const ownerView = await server.fetch(new Request('http://localhost:3001/api/assistant/requests', {
      headers: org1Headers,
    }))
    const ownerData = (await ownerView.json()) as { requests: Array<{ note?: string }> }
    expect(ownerData.requests.some((request) => request.note === 'catatan pribadi pemilik')).toBe(true)

    const otherView = await server.fetch(new Request('http://localhost:3001/api/assistant/requests', {
      headers: org2Headers,
    }))
    const otherData = (await otherView.json()) as { requests: Array<{ note?: string }> }
    expect(otherData.requests.some((request) => request.note === 'catatan pribadi pemilik')).toBe(false)
  })

  it('fails closed when tenant context is missing or rejected', async () => {
    // Unauthenticated inbox request fails with 401
    const unauthInbox = await server.fetch(new Request('http://localhost:3001/api/jobs/1/inbox'))
    expect(unauthInbox.status).toBe(401)

    // Unauthenticated applicants creation fails with 401
    const unauthApp = await server.fetch(new Request('http://localhost:3001/api/applicants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker', email: 'hacker@example.com' }),
    }))
    expect(unauthApp.status).toBe(401)
  })
})
