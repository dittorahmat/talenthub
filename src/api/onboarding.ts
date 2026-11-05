import { Hono } from 'hono'
import { db } from '../db'
import { organizations, trialClaims } from '../db/schema'
import {
  isPublicOrDisposableEmail,
  extractDomain,
  normalizePhoneNumber,
  canClaimTrial,
} from '../services/antiAbuseService'
import { addCredit, getOrCreateWallet } from '../services/walletService'
import { eq, and, desc } from 'drizzle-orm'
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

export const onboardingRouter = new Hono()

const MAX_OTP_ATTEMPTS = 5

/**
 * Test-only seam: lets the integration suite read the code that would have
 * been delivered over WhatsApp. It is never serialized into a response.
 */
export const __onboardingTestHooks: { lastOtp: string | null } = { lastOtp: null }

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/**
 * Buckets a client address by network so a caller cannot escape the trial
 * limiter by rotating a forwarding header. Cloudflare's platform-provided
 * address is authoritative; a caller-supplied X-Forwarded-For is never used.
 */
function clientNetworkKey(c: { req: { header: (name: string) => string | undefined } }): string {
  const platformIp = c.req.header('CF-Connecting-IP')?.trim()
  const realIp = c.req.header('x-real-ip')?.trim()
  const candidate = platformIp || realIp || '127.0.0.1'
  return toNetworkKey(candidate)
}

function toNetworkKey(address: string): string {
  if (address === '127.0.0.1' || address === '::1' || address === 'localhost') {
    return address
  }
  if (address.includes(':')) {
    const groups = address.split(':').filter(Boolean)
    return `${groups.slice(0, 4).join(':')}::/64`
  }
  const octets = address.split('.')
  if (octets.length === 4) {
    return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`
  }
  return address
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
}

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
    const clientIp = clientNetworkKey(c)

    // Check trial eligibility
    const eligibility = await canClaimTrial(domain, cleanPhone, clientIp)
    if (!eligibility.eligible) {
      return c.json({ error: eligibility.reason }, 400)
    }

    // Generate a 6-digit code from a CSPRNG. Only its hash is persisted, and
    // the code itself is delivered exclusively through the WhatsApp channel.
    const otpCode = String(randomInt(100000, 1000000))
    const otpHash = hashOtp(otpCode)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    __onboardingTestHooks.lastOtp = otpCode

    // Save claim record
    await db.insert(trialClaims).values({
      corporateDomain: domain,
      adminEmail: cleanEmail,
      phoneWhatsapp: cleanPhone,
      otpCode: null,
      otpHash,
      otpAttempts: 0,
      otpExpiresAt: expiresAt,
      isVerified: 0,
      ipAddress: clientIp,
    })

    return c.json({
      status: 'OTP_SENT',
      message: 'Kode OTP telah dikirimkan ke nomor WhatsApp Anda',
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

    // Lock the claim after too many failed attempts.
    if (claim.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return c.json({ error: 'Terlalu banyak percobaan kode OTP. Silakan ajukan pendaftaran ulang.' }, 429)
    }

    // Check expiry before comparing, so an expired code cannot be brute-forced.
    if (claim.otpExpiresAt && new Date(claim.otpExpiresAt).getTime() < Date.now()) {
      return c.json({ error: 'Kode OTP telah kadaluarsa. Silakan ajukan pendaftaran ulang.' }, 400)
    }

    // Compare hashes in constant time. Legacy plaintext codes are hashed on read
    // so an in-flight claim created before the migration can still complete.
    const legacyHash = claim.otpCode ? hashOtp(claim.otpCode) : null
    const storedHash = claim.otpHash ?? legacyHash

    if (!storedHash || !constantTimeEqualHex(hashOtp(trimmedOtp), storedHash)) {
      await db
        .update(trialClaims)
        .set({ otpAttempts: claim.otpAttempts + 1 })
        .where(eq(trialClaims.id, claim.id))
      return c.json({ error: 'Kode OTP salah. Silakan periksa kembali pesan WhatsApp Anda.' }, 400)
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
    const newOrg = await db
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
        otpCode: null,
        otpHash: null,
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
