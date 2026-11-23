import { expect, describe, it, beforeAll } from 'bun:test'
import server from '../src/server'
import { sessionHeadersFor } from './helpers/auth'
import { interpolateTemplate, buildWhatsAppUrl, buildEmailMailtoUrl } from '../src/utils/outreach'

describe('Outreach Templates & Dynamic Interpolation (Ticket 01)', () => {
  it('interpolates template tokens properly', () => {
    const raw = 'Halo {{candidate_name}}, selamat bergabung di {{company_name}} untuk posisi {{job_title}}!'
    const result = interpolateTemplate(raw, {
      candidateName: 'Budi Santoso',
      companyName: 'PT Maju Bersama',
      jobTitle: 'Senior React Developer',
    })
    expect(result).toBe('Halo Budi Santoso, selamat bergabung di PT Maju Bersama untuk posisi Senior React Developer!')
  })

  it('builds custom WhatsApp URL with template', () => {
    const url = buildWhatsAppUrl({
      phone: '0812-9988-7766',
      candidateName: 'Siti Aminah',
      jobTitle: 'Product Manager',
      companyName: 'Acme Corp',
      customMessage: 'Halo {{candidate_name}} dari {{company_name}}, jadwal interview untuk {{job_title}} sudah siap.',
    })
    expect(url).toContain('https://wa.me/6281299887766?text=')
    expect(url).toContain(encodeURIComponent('Halo Siti Aminah dari Acme Corp, jadwal interview untuk Product Manager sudah siap.'))
  })

  it('manages outreach templates via API per organization tenant', async () => {
    const org1Headers = await sessionHeadersFor(1)
    const org2Headers = await sessionHeadersFor(2)

    // 1. Create WhatsApp template for Org 1
    const createRes = await server.fetch(new Request('http://localhost:3001/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        name: 'Undangan Interview WhatsApp',
        channel: 'whatsapp',
        body: 'Halo {{candidate_name}}, kami mengundang Anda interview posisi {{job_title}}.',
      }),
    }))

    expect(createRes.status).toBe(201)
    const created = await createRes.json() as any
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Undangan Interview WhatsApp')
    expect(created.channel).toBe('whatsapp')

    // 2. Org 2 should not see Org 1's templates
    const org2ListRes = await server.fetch(new Request('http://localhost:3001/api/templates', {
      headers: org2Headers,
    }))
    expect(org2ListRes.status).toBe(200)
    const org2List = await org2ListRes.json() as any[]
    expect(org2List.some((t) => t.id === created.id)).toBe(false)

    // 3. Org 1 can retrieve its templates
    const org1ListRes = await server.fetch(new Request('http://localhost:3001/api/templates', {
      headers: org1Headers,
    }))
    expect(org1ListRes.status).toBe(200)
    const org1List = await org1ListRes.json() as any[]
    expect(org1List.some((t) => t.id === created.id)).toBe(true)

    // 4. Update template
    const updateRes = await server.fetch(new Request(`http://localhost:3001/api/templates/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...org1Headers,
      },
      body: JSON.stringify({
        name: 'Undangan Interview WhatsApp Terupdate',
      }),
    }))
    expect(updateRes.status).toBe(200)
    const updated = await updateRes.json() as any
    expect(updated.name).toBe('Undangan Interview WhatsApp Terupdate')

    // 5. Delete template
    const deleteRes = await server.fetch(new Request(`http://localhost:3001/api/templates/${created.id}`, {
      method: 'DELETE',
      headers: org1Headers,
    }))
    expect(deleteRes.status).toBe(200)

    // Verify deletion
    const verifyRes = await server.fetch(new Request('http://localhost:3001/api/templates', {
      headers: org1Headers,
    }))
    const verifyList = await verifyRes.json() as any[]
    expect(verifyList.some((t) => t.id === created.id)).toBe(false)
  })
})
