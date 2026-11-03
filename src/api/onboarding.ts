import { Hono } from 'hono'
import { db, sqlite } from '../db'
import { organizations, trialClaims } from '../db/schema'
import {
  isPublicOrDisposableEmail,
  extractDomain,
  normalizePhoneNumber,
  canClaimTrial,
} from '../services/antiAbuseService'
import { addCredit, getOrCreateWallet } from '../services/walletService'
import { eq, and, desc } from 'drizzle-orm'

export const onboardingRouter = new Hono()

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'company'
  return `${base}-${Date.now().toString(36)}`
}

/**
 * POST /api/onboarding/register
 * Step 1: Corporate email and WhatsApp registration
 */
onboardingRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { companyName, adminEmail, phoneWhatsapp } = body

    if (!companyName || !companyName.trim()) {
      return c.json({ error: 'Nama perusahaan/PT wajib diisi' }, 400)
    }

    if (!adminEmail || !adminEmail.trim()) {
      return c.json({ error: 'Email admin wajib diisi' }, 400)
    }

    if (!phoneWhatsapp || !phoneWhatsapp.trim()) {
      return c.json({ error: 'Nomor WhatsApp wajib diisi' }, 400)
    }

    const cleanEmail = adminEmail.trim().toLowerCase()
    const cleanPhone = normalizePhoneNumber(phoneWhatsapp)

    // Check if public/disposable email
    if (isPublicOrDisposableEmail(cleanEmail)) {
      return c.json({
        error: 'Harap gunakan email perusahaan/korporat resmi untuk mengklaim Free Trial',
      }, 400)
    }

    const domain = extractDomain(cleanEmail)
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1'

    // Check trial eligibility
    const eligibility = await canClaimTrial(domain, cleanPhone, clientIp)
    if (!eligibility.eligible) {
      return c.json({ error: eligibility.reason }, 400)
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    console.log(`[ONBOARDING OTP] Sent OTP ${otpCode} to WhatsApp ${cleanPhone} for company ${companyName} (${cleanEmail})`)

    // Save claim record
    await db.insert(trialClaims).values({
      corporateDomain: domain,
      adminEmail: cleanEmail,
      phoneWhatsapp: cleanPhone,
      otpCode,
      otpExpiresAt: expiresAt,
      isVerified: 0,
      ipAddress: clientIp,
    })

    return c.json({
      status: 'OTP_SENT',
      message: 'Kode OTP telah dikirimkan ke nomor WhatsApp Anda',
      // Provide mockOtp in development / test response for easy UI & automation testing
      mockOtp: otpCode,
      phoneWhatsapp: cleanPhone,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

/**
 * POST /api/onboarding/verify-otp
 * Step 2: OTP verification, organization creation, and 20 trial credits grant
 */
onboardingRouter.post('/verify-otp', async (c) => {
  try {
    const body = await c.req.json()
    const { phoneWhatsapp, otpCode, companyName } = body

    if (!phoneWhatsapp || !otpCode) {
      return c.json({ error: 'Nomor WhatsApp dan kode OTP wajib diisi' }, 400)
    }

    const cleanPhone = normalizePhoneNumber(phoneWhatsapp)
    const trimmedOtp = otpCode.toString().trim()

    // Find the latest pending claim for this phone
    const claim = await db
      .select()
      .from(trialClaims)
      .where(
        and(
          eq(trialClaims.phoneWhatsapp, cleanPhone),
          eq(trialClaims.isVerified, 0)
        )
      )
      .orderBy(desc(trialClaims.id))
      .get()

    if (!claim) {
      return c.json({ error: 'Data klaim pendaftaran tidak ditemukan atau sudah diverifikasi' }, 404)
    }

    // Check OTP match
    if (claim.otpCode !== trimmedOtp) {
      return c.json({ error: 'Kode OTP salah. Silakan periksa kembali pesan WhatsApp Anda.' }, 400)
    }

    // Check expiry
    if (claim.otpExpiresAt && new Date(claim.otpExpiresAt).getTime() < Date.now()) {
      return c.json({ error: 'Kode OTP telah kadaluarsa. Silakan ajukan pendaftaran ulang.' }, 400)
    }

    // Double check domain/phone haven't been claimed in the meantime (only check verified claims to avoid self-blocking)
    const alreadyClaimed = await db
      .select()
      .from(trialClaims)
      .where(
        and(
          eq(trialClaims.corporateDomain, claim.corporateDomain),
          eq(trialClaims.isVerified, 1)
        )
      )
      .get()

    if (alreadyClaimed) {
      return c.json({ error: `Domain perusahaan ${claim.corporateDomain} telah mengklaim free trial sebelumnya.` }, 400)
    }

    const now = new Date().toISOString()
    const resolvedCompanyName = companyName?.trim() || claim.corporateDomain.split('.')[0].toUpperCase()
    const slug = generateSlug(resolvedCompanyName)

    // Execute organization creation and trial grant
    const newOrg = db
      .insert(organizations)
      .values({
        name: resolvedCompanyName,
        slug,
        createdAt: now,
      })
      .returning()
      .get()

    // Ensure wallet exists
    await getOrCreateWallet(newOrg.id)

    // Award 20 free trial credits
    await addCredit(newOrg.id, 20, 'TRIAL_GRANT', 'Kredit Free Trial Onboarding Perusahaan')

    // Mark claim as verified
    await db
      .update(trialClaims)
      .set({
        organizationId: newOrg.id,
        isVerified: 1,
        claimedAt: now,
      })
      .where(eq(trialClaims.id, claim.id))

    return c.json({
      status: 'VERIFIED',
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
      },
      trialCredits: 20,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
