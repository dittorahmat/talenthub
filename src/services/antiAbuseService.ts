import { db } from '../db'
import { trialClaims } from '../db/schema'
import { eq, or, and } from 'drizzle-orm'

// Common public/free email providers
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.id',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'zoho.com',
  'proton.me',
  'protonmail.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
])

// Common temporary/disposable email providers
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'sharklasers.com',
  'trashmail.com',
  'getairmail.com',
  'dispostable.com',
  'temp-mail.org',
  'yopmail.com',
  'fakemailgenerator.com',
])

/**
 * Extracts and cleans the domain from an email string.
 */
export function extractDomain(email: string): string {
  if (!email || !email.includes('@')) {
    return ''
  }
  const parts = email.trim().toLowerCase().split('@')
  return parts[parts.length - 1] || ''
}

/**
 * Checks whether an email address is from a public or disposable email domain.
 */
export function isPublicOrDisposableEmail(email: string): boolean {
  const domain = extractDomain(email)
  if (!domain) return true
  return PUBLIC_EMAIL_DOMAINS.has(domain) || DISPOSABLE_DOMAINS.has(domain)
}

/**
 * Sanitizes phone numbers by removing spaces, dashes, parentheses and normalizing country code.
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.slice(2)
  } else if (cleaned.startsWith('+62')) {
    cleaned = cleaned.slice(1)
  }
  return cleaned
}

/**
 * Checks if a domain, phone, or IP is eligible for a new free trial claim.
 */
export async function canClaimTrial(
  domain: string,
  phone: string,
  ip?: string
): Promise<{ eligible: boolean; reason?: string }> {
  const cleanDomain = domain.toLowerCase().trim()
  const cleanPhone = normalizePhoneNumber(phone)

  // 1. Check if domain already claimed (verified or active recent claim)
  const existingDomainClaim = await db
    .select()
    .from(trialClaims)
    .where(
      and(
        eq(trialClaims.corporateDomain, cleanDomain),
        eq(trialClaims.isVerified, 1)
      )
    )
    .get()

  if (existingDomainClaim) {
    return {
      eligible: false,
      reason: `Domain perusahaan ${cleanDomain} telah digunakan untuk klaim Free Trial sebelumnya.`,
    }
  }

  // 1b. Check if there is an unverified active claim in the last 15 minutes with different phone (prevent OTP hijacking)
  const recentUnverifiedDomain = await db
    .select()
    .from(trialClaims)
    .where(
      and(
        eq(trialClaims.corporateDomain, cleanDomain),
        eq(trialClaims.isVerified, 0)
      )
    )
    .get()

  if (recentUnverifiedDomain && recentUnverifiedDomain.phoneWhatsapp !== cleanPhone && recentUnverifiedDomain.otpExpiresAt) {
    const expires = new Date(recentUnverifiedDomain.otpExpiresAt).getTime()
    if (Date.now() < expires) {
      return {
        eligible: false,
        reason: `Kode verifikasi sedang aktif untuk domain ${cleanDomain}. Silakan gunakan nomor WhatsApp yang didaftarkan sebelumnya atau tunggu sesaat.`,
      }
    }
  }

  // 2. Check if phone number already claimed
  const existingPhoneClaim = await db
    .select()
    .from(trialClaims)
    .where(
      and(
        eq(trialClaims.phoneWhatsapp, cleanPhone),
        eq(trialClaims.isVerified, 1)
      )
    )
    .get()

  if (existingPhoneClaim) {
    return {
      eligible: false,
      reason: `Nomor WhatsApp ${cleanPhone} telah digunakan untuk klaim Free Trial sebelumnya.`,
    }
  }

  // 3. IP Rate Limiting Check (max 3 trial registrations per IP per 24 hours)
  if (ip && ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost') {
    const claimsFromIp = await db
      .select()
      .from(trialClaims)
      .where(eq(trialClaims.ipAddress, ip))
      .all()
    if (claimsFromIp && claimsFromIp.length >= 3) {
      return {
        eligible: false,
        reason: 'Batas pendaftaran Free Trial dari jaringan/perangkat Anda telah tercapai. Hubungi tim sales kami.',
      }
    }
  }

  return { eligible: true }
}
