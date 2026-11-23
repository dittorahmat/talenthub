import { expect, describe, it } from 'bun:test'
import server from '../src/server'
import { sessionHeadersFor } from './helpers/auth'

describe('Dynamic Custom Pipeline Stages per Job (Ticket 03)', () => {
  it('creates and updates custom pipeline stages on a job', async () => {
    const org1Headers = await sessionHeadersFor(1)

    // 1. Create a job with custom stages
    const customStages = [
      { id: 'applied', name: 'Applied', order: 1, type: 'applied' },
      { id: 'screening', name: 'AI Screening', order: 2, type: 'screening' },
      { id: 'coding_test', name: 'Coding Test', order: 3, type: 'interview' },
      { id: 'final_interview', name: 'Final Interview', order: 4, type: 'interview' },
      { id: 'offer', name: 'Offer', order: 5, type: 'offer' },
      { id: 'hired', name: 'Hired', order: 6, type: 'hired' },
    ]

    const createRes = await server.fetch(new Request('http://localhost:3001/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        title: 'Senior Distributed Systems Engineer',
        location: 'Jakarta, Indonesia',
        remote: 'Hybrid',
        pipeline_stages: customStages,
        auto_screen_public: true,
        daily_public_screening_cap: 35,
      }),
    }))

    expect(createRes.status).toBe(201)
    const createdJob = await createRes.json() as any
    expect(createdJob.title).toBe('Senior Distributed Systems Engineer')
    expect(createdJob.pipeline_stages).toBeArray()
    expect(createdJob.pipeline_stages.length).toBe(6)
    expect(createdJob.pipeline_stages[2].name).toBe('Coding Test')
    expect(createdJob.auto_screen_public).toBe(true)
    expect(createdJob.daily_public_screening_cap).toBe(35)

    // 2. Fetch the job detail and verify stages persistence
    const getRes = await server.fetch(new Request(`http://localhost:3001/api/jobs/${createdJob.id}`, {
      headers: org1Headers,
    }))
    expect(getRes.status).toBe(200)
    const detail = await getRes.json() as any
    expect(detail.pipeline_stages).toBeArray()
    expect(detail.pipeline_stages.some((s: any) => s.name === 'Coding Test')).toBe(true)

    // 3. Update pipeline stages on the job
    const updatedStages = [
      ...customStages,
      { id: 'background_check', name: 'Background Check', order: 7, type: 'screening' },
    ]

    const putRes = await server.fetch(new Request(`http://localhost:3001/api/jobs/${createdJob.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        pipeline_stages: updatedStages,
      }),
    }))
    expect(putRes.status).toBe(200)
    const updatedJob = await putRes.json() as any
    expect(updatedJob.pipeline_stages.length).toBe(7)
    expect(updatedJob.pipeline_stages.some((s: any) => s.name === 'Background Check')).toBe(true)
  })
})
