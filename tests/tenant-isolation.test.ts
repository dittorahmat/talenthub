import { db, sqlite } from '../src/db'
import { organizations, jobs, applicants, notes, activities } from '../src/db/schema'
import { eq, and } from 'drizzle-orm'
import server from '../src/server'

console.log('--- START TENANT ISOLATION TESTS ---')

// 1. Check organizations seeded
const orgs = await db.select().from(organizations).all()
console.assert(orgs.length >= 2, 'Should have at least 2 organizations')
console.log('Seeded Orgs:', orgs.map(o => ({ id: o.id, name: o.name, slug: o.slug })))

// 2. Test GET /api/jobs without header -> defaults to Org 1 (Tech Satu Solusi)
let res = await server.fetch(new Request('http://localhost:3001/api/jobs'))
let data = await res.json()
console.assert(res.status === 200, 'Jobs request without header should return 200')
console.assert(Array.isArray(data) && data.length === 3, 'Org 1 should have 3 jobs seeded')
console.log('Org 1 Jobs count:', data.length)

// 3. Test GET /api/jobs with header x-organization-id: 2 -> Org 2 should have 0 jobs
res = await server.fetch(new Request('http://localhost:3001/api/jobs', {
  headers: { 'x-organization-id': '2' }
}))
data = await res.json()
console.assert(res.status === 200, 'Jobs request with x-organization-id: 2 should return 200')
console.assert(Array.isArray(data) && data.length === 0, 'Org 2 should have 0 jobs initially')
console.log('Org 2 Jobs count (expected 0):', data.length)

// 4. Create a job for Org 2
res = await server.fetch(new Request('http://localhost:3001/api/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-organization-id': '2'
  },
  body: JSON.stringify({
    title: 'Cloud Security Architect',
    location: 'Jakarta, Indonesia',
    remote: 'Yes'
  })
}))
console.assert(res.status === 201, 'Creating job for Org 2 should succeed')
const newJobOrg2 = await res.json()
console.assert(newJobOrg2.organization_id === 2, 'Created job must have organization_id 2')
console.log('Created Org 2 Job:', newJobOrg2)

// 5. Verify Org 1 cannot see Org 2's new job
res = await server.fetch(new Request('http://localhost:3001/api/jobs', {
  headers: { 'x-organization-id': '1' }
}))
data = await res.json()
console.assert(data.length === 3, 'Org 1 should still only see 3 jobs')
console.assert(!data.some((j: any) => j.id === newJobOrg2.id), 'Org 1 must NOT see Org 2 job')

// 6. Verify Org 1 cannot access Org 2's job by ID
res = await server.fetch(new Request(`http://localhost:3001/api/jobs/${newJobOrg2.id}`, {
  headers: { 'x-organization-id': '1' }
}))
console.assert(res.status === 404, 'Org 1 accessing Org 2 job should return 404 Not Found')

// 7. Verify Org 2 CAN access its job by ID
res = await server.fetch(new Request(`http://localhost:3001/api/jobs/${newJobOrg2.id}`, {
  headers: { 'x-organization-id': '2' }
}))
console.assert(res.status === 200, 'Org 2 accessing its own job should return 200')

// 8. Create applicant in Org 2
res = await server.fetch(new Request('http://localhost:3001/api/applicants', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-organization-id': '2'
  },
  body: JSON.stringify({
    job_id: newJobOrg2.id,
    name: 'Budi Security',
    email: 'budi.sec@example.com'
  })
}))
console.assert(res.status === 201, 'Creating applicant in Org 2 should succeed')
const newAppOrg2 = await res.json()
console.assert(newAppOrg2.organization_id === 2, 'Applicant must have organization_id 2')

// 9. Verify Org 1 cannot access Org 2 applicant
res = await server.fetch(new Request(`http://localhost:3001/api/applicants/${newAppOrg2.id}`, {
  headers: { 'x-organization-id': '1' }
}))
console.assert(res.status === 404, 'Org 1 accessing Org 2 applicant should return 404')

// 10. Verify Org 1 cannot delete Org 2 job
res = await server.fetch(new Request(`http://localhost:3001/api/jobs/${newJobOrg2.id}`, {
  method: 'DELETE',
  headers: { 'x-organization-id': '1' }
}))
console.assert(res.status === 404, 'Org 1 deleting Org 2 job should return 404')

// Cleanup Org 2 test job and applicant
await db.delete(applicants).where(eq(applicants.id, newAppOrg2.id))
await db.delete(jobs).where(eq(jobs.id, newJobOrg2.id))

console.log('--- ALL TENANT ISOLATION TESTS PASSED! ---')
process.exit(0)
