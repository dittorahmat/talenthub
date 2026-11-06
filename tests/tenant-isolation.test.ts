import { expect } from 'bun:test'
import { db } from '../src/db'
import { organizations, jobs, applicants } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import server from '../src/server'
import { sessionHeadersFor } from './helpers/auth'

console.log('--- START TENANT ISOLATION TESTS ---')

const org1Headers = await sessionHeadersFor(1)
const org2Headers = await sessionHeadersFor(2)

// 1. Check organizations seeded
const orgs = await db.select().from(organizations).all()
expect(orgs.length).toBeGreaterThanOrEqual(2)
console.log('Seeded Orgs:', orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug })))

// 2. Unauthenticated request must be rejected
let res = await server.fetch(new Request('http://localhost:3001/api/jobs'))
expect(res.status).toBe(401)

// 3. Record baseline counts for each tenant
const org1JobsBefore = await db.select().from(jobs).where(eq(jobs.organizationId, 1)).all()
const org2JobsBefore = await db.select().from(jobs).where(eq(jobs.organizationId, 2)).all()

res = await server.fetch(new Request('http://localhost:3001/api/jobs', { headers: org1Headers }))
let data = await res.json()
expect(res.status).toBe(200)
expect(data.length).toBe(org1JobsBefore.length)

res = await server.fetch(new Request('http://localhost:3001/api/jobs', { headers: org2Headers }))
data = await res.json()
expect(res.status).toBe(200)
expect(data.length).toBe(org2JobsBefore.length)

// 4. A session for Org 1 must not be able to assert Org 2 via the header
res = await server.fetch(new Request('http://localhost:3001/api/jobs', {
  headers: { ...org1Headers, 'x-organization-id': '2' },
}))
expect(res.status).toBe(403)

// 5. Create a job for Org 2
res = await server.fetch(new Request('http://localhost:3001/api/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...org2Headers,
  },
  body: JSON.stringify({
    title: 'Cloud Security Architect',
    location: 'Jakarta, Indonesia',
    remote: 'Yes',
  }),
}))
expect(res.status).toBe(201)
const newJobOrg2 = await res.json()
expect(newJobOrg2.organization_id).toBe(2)

// 6. Verify Org 1 cannot see Org 2's new job
res = await server.fetch(new Request('http://localhost:3001/api/jobs', { headers: org1Headers }))
data = await res.json()
expect(data.length).toBe(org1JobsBefore.length)
expect(data.some((j: any) => j.id === newJobOrg2.id)).toBe(false)

// 7. Verify Org 1 cannot access Org 2's job by ID
res = await server.fetch(new Request(`http://localhost:3001/api/jobs/${newJobOrg2.id}`, { headers: org1Headers }))
expect(res.status).toBe(404)

// 8. Verify Org 2 CAN access its job by ID
res = await server.fetch(new Request(`http://localhost:3001/api/jobs/${newJobOrg2.id}`, { headers: org2Headers }))
expect(res.status).toBe(200)

// 9. Create applicant in Org 2
res = await server.fetch(new Request('http://localhost:3001/api/applicants', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...org2Headers,
  },
  body: JSON.stringify({
    job_id: newJobOrg2.id,
    name: 'Budi Security',
    email: 'budi.sec@example.com',
  }),
}))
expect(res.status).toBe(201)
const newAppOrg2 = await res.json()
expect(newAppOrg2.organization_id).toBe(2)

// 10. Verify Org 1 cannot access Org 2 applicant
res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${newAppOrg2.id}`, { headers: org1Headers }))
expect(res.status).toBe(404)

// 11. Verify Org 1 cannot delete Org 2 job
res = await server.fetch(new Request(`http://localhost:3001/api/jobs/${newJobOrg2.id}`, {
  method: 'DELETE',
  headers: org1Headers,
}))
expect(res.status).toBe(404)

// Cleanup Org 2 test job and applicant
await db.delete(applicants).where(eq(applicants.id, newAppOrg2.id))
await db.delete(jobs).where(eq(jobs.id, newJobOrg2.id))

console.log('--- ALL TENANT ISOLATION TESTS PASSED! ---')
