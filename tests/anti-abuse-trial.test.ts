import { describe, it, expect, beforeEach } from 'bun:test'
import server from '../src/server'
import { db } from '../src/db'
import { trialClaims, organizations, creditWallets, creditTransactions } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { isPublicOrDisposableEmail, extractDomain } from '../src/services/antiAbuseService'
import { sessionHeadersFor } from './helpers/auth'

describe('Anti-Abuse Free Trial Onboarding Tests', () => {
  const baseUrl = 'http://localhost:3001'

  it('email validation identifies public & disposable emails correctly', () => {
    expect(isPublicOrDisposableEmail('recruiter@gmail.com')).toBe(true)
    expect(isPublicOrDisposableEmail('hr@yahoo.com')).toBe(true)
    expect(isPublicOrDisposableEmail('test@mailinator.com')).toBe(true)
    expect(isPublicOrDisposableEmail('talent@yopmail.com')).toBe(true)
    expect(isPublicOrDisposableEmail('user@hotmail.com')).toBe(true)

    // Corporate emails should be allowed
    expect(isPublicOrDisposableEmail('hr@gojek.com')).toBe(false)
    expect(isPublicOrDisposableEmail('recruiter@tokopedia.com')).toBe(false)
    expect(isPublicOrDisposableEmail('talent@traveloka.com')).toBe(false)
    expect(extractDomain('recruiter@tokopedia.com')).toBe('tokopedia.com')
  })

  it('rejects registration with public email (e.g. recruiter@gmail.com)', async () => {
    const res = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'PT Startup Kita',
          adminEmail: 'recruiter@gmail.com',
          phoneWhatsapp: '081234567890',
        }),
      })
    )

    expect(res.status).toBe(400)
    const data = (await res.json()) as any
    expect(data.error).toContain('email perusahaan/korporat resmi')
  })

  it('allows corporate email registration and sends WhatsApp OTP', async () => {
    const uniqueDomain = `perusahaan-${Date.now()}.com`
    const phone = `0819${Math.floor(10000000 + Math.random() * 90000000)}`

    const res = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'PT Maju Bersama',
          adminEmail: `hr@${uniqueDomain}`,
          phoneWhatsapp: phone,
        }),
      })
    )

    expect(res.status).toBe(200)
    const data = (await res.json()) as any
    expect(data.status).toBe('OTP_SENT')
    expect(data.mockOtp).toBeDefined()
    expect(data.mockOtp.length).toBe(6)
  })

  it('verifies OTP and awards exactly 20 free trial credits with TRIAL_GRANT transaction', async () => {
    const uniqueDomain = `corp-${Date.now()}.co.id`
    const phone = `0857${Math.floor(10000000 + Math.random() * 90000000)}`
    const companyName = `PT Inovasi Digital ${Date.now()}`

    // 1. Register
    const regRes = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          adminEmail: `admin@${uniqueDomain}`,
          phoneWhatsapp: phone,
        }),
      })
    )
    expect(regRes.status).toBe(200)
    const regData = (await regRes.json()) as any
    const otp = regData.mockOtp

    // 2. Verify with wrong OTP
    const wrongRes = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          phoneWhatsapp: phone,
          otpCode: '000000',
        }),
      })
    )
    expect(wrongRes.status).toBe(400)
    const wrongData = (await wrongRes.json()) as any
    expect(wrongData.error).toContain('Kode OTP salah')

    // 3. Verify with correct OTP
    const verifyRes = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          phoneWhatsapp: phone,
          otpCode: otp,
        }),
      })
    )
    expect(verifyRes.status).toBe(200)
    const verifyData = (await verifyRes.json()) as any
    expect(verifyData.status).toBe('VERIFIED')
    expect(verifyData.trialCredits).toBe(20)
    expect(verifyData.organization.id).toBeDefined()
    expect(verifyData.organization.name).toBe(companyName)

    const orgId = verifyData.organization.id

    // 4. Verify wallet balance via GET /api/wallet
    const walletRes = await server.fetch(
      new Request(`${baseUrl}/api/wallet`, {
        headers: await sessionHeadersFor(orgId),
      })
    )
    expect(walletRes.status).toBe(200)
    const walletData = (await walletRes.json()) as any
    expect(walletData.balance).toBe(20)
    expect(walletData.transactions.length).toBeGreaterThanOrEqual(1)
    expect(walletData.transactions[0].type).toBe('TRIAL_GRANT')
    expect(walletData.transactions[0].amount).toBe(20)
  })

  it('blocks duplicate domain claim from another user/phone', async () => {
    const fixedDomain = `unique-${Date.now()}.com`
    const phone1 = `0812${Math.floor(10000000 + Math.random() * 90000000)}`
    const phone2 = `0813${Math.floor(10000000 + Math.random() * 90000000)}`

    // First user claims
    const regRes1 = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'PT Unicorn Satu',
          adminEmail: `recruiter1@${fixedDomain}`,
          phoneWhatsapp: phone1,
        }),
      })
    )
    const regData1 = (await regRes1.json()) as any

    // Verify first user
    const verRes1 = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'PT Unicorn Satu',
          phoneWhatsapp: phone1,
          otpCode: regData1.mockOtp,
        }),
      })
    )
    expect(verRes1.status).toBe(200)

    // Second user attempts to claim with same domain
    const regRes2 = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'PT Unicorn Cabang',
          adminEmail: `recruiter2@${fixedDomain}`,
          phoneWhatsapp: phone2,
        }),
      })
    )

    expect(regRes2.status).toBe(400)
    const regData2 = (await regRes2.json()) as any
    expect(regData2.error).toContain('telah digunakan untuk klaim Free Trial')
  })

  it('blocks duplicate phone number claim', async () => {
    const phone = `0899${Math.floor(10000000 + Math.random() * 90000000)}`
    const domain1 = `company1-${Date.now()}.com`
    const domain2 = `company2-${Date.now()}.com`

    // First claim with this phone
    const reg1 = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'PT Alpha',
          adminEmail: `hr@${domain1}`,
          phoneWhatsapp: phone,
        }),
      })
    )
    const d1 = (await reg1.json()) as any
    await server.fetch(
      new Request(`${baseUrl}/api/onboarding/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'PT Alpha',
          phoneWhatsapp: phone,
          otpCode: d1.mockOtp,
        }),
      })
    )

    // Second claim with same phone but different domain
    const reg2 = await server.fetch(
      new Request(`${baseUrl}/api/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'PT Beta',
          adminEmail: `hr@${domain2}`,
          phoneWhatsapp: phone,
        }),
      })
    )

    expect(reg2.status).toBe(400)
    const d2 = (await reg2.json()) as any
    expect(d2.error).toContain('telah digunakan untuk klaim Free Trial')
  })
})
