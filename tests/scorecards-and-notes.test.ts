import { expect, describe, it } from 'bun:test'
import server from '../src/server'
import { sessionHeadersFor } from './helpers/auth'

describe('Candidate Scorecards & Collaborative Notes (Ticket 02)', () => {
  it('manages structured scorecards and aggregates ratings per applicant', async () => {
    const org1Headers = await sessionHeadersFor(1)
    const org2Headers = await sessionHeadersFor(2)

    // Applicant 1 belongs to Org 1
    const applicantId = 1

    // 1. Submit scorecard from Evaluator 1
    const submitRes1 = await server.fetch(new Request(`http://localhost:3001/api/applicants/${applicantId}/scorecards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        technicalScore: 4,
        cultureScore: 5,
        communicationScore: 4,
        recommendation: 'Strong Yes',
        notes: 'Pemahaman TypeScript dan backend edge sangat matang.',
      }),
    }))

    expect(submitRes1.status).toBe(201)
    const card1 = await submitRes1.json() as any
    expect(card1.technicalScore).toBe(4)
    expect(card1.recommendation).toBe('Strong Yes')

    // 2. Fetch scorecards and verify aggregates
    const getRes = await server.fetch(new Request(`http://localhost:3001/api/applicants/${applicantId}/scorecards`, {
      headers: org1Headers,
    }))
    expect(getRes.status).toBe(200)
    const data = await getRes.json() as any
    expect(data.aggregate.count).toBeGreaterThanOrEqual(1)
    expect(data.aggregate.avgTechnical).toBeGreaterThanOrEqual(4)

    // 3. Org 2 cannot view or submit scorecard for Org 1's candidate
    const crossRes = await server.fetch(new Request(`http://localhost:3001/api/applicants/${applicantId}/scorecards`, {
      headers: org2Headers,
    }))
    expect(crossRes.status).toBe(404)

    // 4. Submit and retrieve team activity notes
    const noteRes = await server.fetch(new Request(`http://localhost:3001/api/applicants/${applicantId}/team-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        content: 'Perlu verifikasi portofolio arsitektur Cloudflare Workers di sesi berikutnya.',
      }),
    }))
    expect(noteRes.status).toBe(201)
    const note = await noteRes.json() as any
    expect(note.content).toContain('Cloudflare Workers')

    const getNotesRes = await server.fetch(new Request(`http://localhost:3001/api/applicants/${applicantId}/team-notes`, {
      headers: org1Headers,
    }))
    expect(getNotesRes.status).toBe(200)
    const notesList = await getNotesRes.json() as any[]
    expect(notesList.some((n) => n.id === note.id)).toBe(true)
  })
})
