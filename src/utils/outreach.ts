/**
 * Candidate outreach utilities: phone normalization and direct link builders.
 */

export interface TemplateVariables {
  candidateName: string
  jobTitle?: string | null
  companyName?: string | null
  interviewLink?: string | null
}

/**
 * Replaces dynamic variables in text template.
 * Supported variables: {{candidate_name}}, {{job_title}}, {{company_name}}, {{interview_link}}
 */
export function interpolateTemplate(text: string, vars: TemplateVariables): string {
  if (!text) return ''
  return text
    .replace(/\{\{\s*candidate_name\s*\}\}/gi, vars.candidateName || 'Kandidat')
    .replace(/\{\{\s*job_title\s*\}\}/gi, vars.jobTitle || 'posisi terkait')
    .replace(/\{\{\s*company_name\s*\}\}/gi, vars.companyName || 'TalentHub')
    .replace(/\{\{\s*interview_link\s*\}\}/gi, vars.interviewLink || '')
}

/**
 * Normalizes an Indonesian / international phone number to E.164 without leading plus.
 * e.g. "0812-3456-7890", "+62 812 3456", "812 3456" -> "6281234567890"
 */
export function normalizeE164Phone(phone?: string | null): string {
  if (!phone) return ''
  // Strip everything that is not a digit
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('08')) {
    digits = '628' + digits.slice(2)
  } else if (digits.startsWith('62')) {
    // already 62...
  } else if (digits.startsWith('8')) {
    digits = '62' + digits
  }
  return digits
}

/**
 * Builds a WhatsApp Web link with personalized greeting.
 */
export function buildWhatsAppUrl(options: {
  phone?: string | null
  candidateName: string
  jobTitle?: string | null
  companyName?: string | null
  customMessage?: string | null
}): string {
  const cleanPhone = normalizeE164Phone(options.phone)
  let message = options.customMessage
  if (message) {
    message = interpolateTemplate(message, {
      candidateName: options.candidateName,
      jobTitle: options.jobTitle,
      companyName: options.companyName,
    })
  } else {
    const role = options.jobTitle?.trim() || 'posisi terkait'
    const company = options.companyName?.trim() || 'TalentHub'
    message = `Halo ${options.candidateName}, kami dari tim rekrutmen telah mereview CV Anda untuk posisi ${role} di ${company} dan tertarik untuk mengundang Anda ke tahap wawancara. Kapan waktu luang Anda?`
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Builds a mailto link with personalized subject and message body.
 */
export function buildEmailMailtoUrl(options: {
  email?: string | null
  candidateName: string
  jobTitle?: string | null
  companyName?: string | null
  customSubject?: string | null
  customBody?: string | null
}): string {
  const email = (options.email || '').trim()
  const vars: TemplateVariables = {
    candidateName: options.candidateName,
    jobTitle: options.jobTitle,
    companyName: options.companyName,
  }

  const role = options.jobTitle?.trim() || 'Lamaran Kerja'
  const subject = options.customSubject
    ? interpolateTemplate(options.customSubject, vars)
    : `Proses Rekrutmen: ${role}`

  const body = options.customBody
    ? interpolateTemplate(options.customBody, vars)
    : `Halo ${options.candidateName},\n\nTerima kasih atas ketertarikan Anda untuk bergabung bersama kami. Kami telah meninjau CV Anda untuk posisi ${role} dan ingin mengundang Anda ke tahapan proses selanjutnya.\n\nSalam,\nTim Rekrutmen`

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export interface ResumeFileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates resume file extension and size.
 */
export function validateResumeFile(file: File): ResumeFileValidationResult {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'doc') {
    return {
      valid: false,
      error: 'Format .doc lama tidak didukung. Mohon simpan ulang sebagai .docx atau .pdf',
    }
  }
  if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
    return {
      valid: false,
      error: 'Format berkas harus berupa PDF, DOCX, atau TXT',
    }
  }
  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Ukuran berkas maksimal 5MB',
    }
  }
  return { valid: true }
}
