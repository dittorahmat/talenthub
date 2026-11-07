export type ApplicantInput = {
  id: number
  name: string
  resumeKeywords?: string | null
}

export type JobInput = {
  title: string
}

export type ScreeningResult = {
  summary: string
  score: number
  band: string
  matched: string[]
  missing: string[]
  expYears: number
}

export const KEYWORD_POOL = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Bun', 'Python',
  'Django', 'FastAPI', 'Go', 'Golang', 'Java', 'Spring', 'Docker', 'Kubernetes',
  'AWS', 'GCP', 'Azure', 'CI/CD', 'Git', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'Linux', 'Figma', 'UI/UX', 'Product Design', 'Management', 'Agile', 'Scrum'
]

/**
 * Extracts recognized technical keywords from raw text against the canonical KEYWORD_POOL.
 */
export function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  return KEYWORD_POOL.filter(kw => lower.includes(kw.toLowerCase()))
}

/**
 * Resolves required skills based on explicit requirements or job title defaults.
 */
export function requiredForJob(jobTitle: string, jobRequirements?: string[] | string): string[] {
  if (Array.isArray(jobRequirements) && jobRequirements.length > 0) {
    return jobRequirements
  }
  if (typeof jobRequirements === 'string' && jobRequirements.trim().length > 0) {
    return jobRequirements.split(',').map(s => s.trim()).filter(Boolean)
  }

  const t = jobTitle.toLowerCase()
  if (t.includes('frontend') || t.includes('front-end') || t.includes('react')) {
    return ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Git', 'CI/CD']
  }
  if (t.includes('backend') || t.includes('back-end') || t.includes('api')) {
    return ['Node.js', 'TypeScript', 'SQL', 'PostgreSQL', 'Docker', 'Git']
  }
  if (t.includes('fullstack') || t.includes('full-stack')) {
    return ['React', 'Node.js', 'TypeScript', 'SQL', 'Git', 'Docker']
  }
  if (t.includes('designer') || t.includes('ui') || t.includes('ux') || t.includes('product design')) {
    return ['Figma', 'UI/UX', 'Product Design', 'Agile']
  }
  if (t.includes('devops') || t.includes('sre') || t.includes('cloud')) {
    return ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD', 'Git']
  }
  return ['JavaScript', 'TypeScript', 'Git', 'SQL', 'Agile']
}

export function hashInt(n: number): number {
  let x = n | 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = (x ^ (x >>> 16)) >>> 0
  return x
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(hashInt(h))
}

const BAND_STRONG = 75
const BAND_POTENTIAL = 50

export function bandFor(score: number): string {
  if (score >= BAND_STRONG) return 'Strong'
  if (score >= BAND_POTENTIAL) return 'Potential'
  return 'Weak'
}

export function verdictFor(band: string): string {
  if (band === 'Strong') return 'Hire'
  if (band === 'Potential') return 'Consider'
  return 'Pass'
}

export function rationaleFor(ctx: {
  name: string
  verdict: string
  matched: string[]
  missing: string[]
  knockoutFailed?: string | null
}): string {
  if (ctx.knockoutFailed) {
    return `${ctx.name} dinilai ${ctx.verdict} karena tidak memenuhi: ${ctx.knockoutFailed}.`
  }
  if (ctx.verdict === 'Hire') {
    const top = ctx.matched[0] ?? 'keahlian inti'
    return `${ctx.name} direkomendasikan Hire karena unggul di ${top}.`
  }
  if (ctx.verdict === 'Consider') {
    const top = ctx.matched[0] ?? 'beberapa keahlian relevan'
    const miss = ctx.missing[0] ?? 'beberapa area'
    return `${ctx.name} dipertimbangkan Consider karena menguasai ${top} namun perlu penguatan di ${miss}.`
  }
  if (ctx.matched.length === 0) {
    return `${ctx.name} dinilai Pass karena tidak ada teks terbaca.`
  }
  const miss = ctx.missing[0] ?? 'keahlian yang dibutuhkan'
  return `${ctx.name} dinilai Pass karena kekurangan ${miss}.`
}

const SUMMARY_TEMPLATES: Array<(ctx: {
  name: string
  expYears: number
  jobTitle: string
  matchedStr: string
  missingStr: string
  band: string
  score: number
}) => string> = [
  ({ name, expYears, jobTitle, matchedStr, band }) =>
    `${name} memiliki ${expYears} tahun pengalaman dengan keahlian di ${matchedStr || 'pengembangan umum'}. Profil sangat relevan untuk ${jobTitle} dengan kecocokan ${band.toLowerCase()} dan siap berkontribusi sejak hari pertama. Pengalaman terakhir sebagai pengembang menunjukkan konsistensi dalam delivery fitur berkualitas.`,
  ({ name, expYears, jobTitle, matchedStr, missingStr }) =>
    `Kandidat ${name} membawa ${expYears} tahun pengalaman profesional dan menguasai ${matchedStr || 'berbagai teknologi'}. Untuk peran ${jobTitle}, kekuatan utamanya pada penguasaan tools inti meski masih perlu penguatan di ${missingStr || 'beberapa area'}. Riwayat kerja terakhir menunjukkan adaptasi cepat pada lingkungan tim.`,
  ({ name, expYears, matchedStr, jobTitle }) =>
    `Dengan ${expYears} tahun di industri, ${name} menonjol lewat penguasaan ${matchedStr || 'teknologi umum'} yang selaras dengan kebutuhan ${jobTitle}. CV menunjukkan proyek relevan dan kolaborasi lintas fungsi yang baik. Cocok untuk tahap screening lanjutan.`,
  ({ name, expYears, jobTitle, matchedStr }) =>
    `${name} adalah kandidat dengan ${expYears} tahun pengalaman yang relevan untuk ${jobTitle}. Keahlian kunci ${matchedStr || 'belum spesifik'} tercermin dalam portofolio dan pengalaman kerja sebelumnya. Secara umum menunjukkan potensi pertumbuhan yang baik di tim.`,
  ({ name, expYears, jobTitle, matchedStr, missingStr, score }) =>
    `Screening untuk ${name} (${expYears} tahun pengalaman) menunjukkan skor ${score} untuk ${jobTitle}. Menguasai ${matchedStr || 'dasar-dasar teknis'} namun perlu pendampingan pada ${missingStr || 'teknologi pelengkap'}. Pengalaman sebelumnya di posisi serupa menjadi nilai tambah.`,
  ({ name, expYears, jobTitle, matchedStr }) =>
    `${name} memiliki latar belakang ${expYears} tahun yang solid untuk posisi ${jobTitle}. Terbukti mahir di ${matchedStr || 'beberapa area inti'} melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.`,
  ({ name, expYears, jobTitle, matchedStr, missingStr }) =>
    `Profil ${name} mencatat ${expYears} tahun pengalaman dengan fokus pada ${matchedStr || 'pengembangan produk'}. Untuk ${jobTitle}, kesesuaian cukup baik walau ada gap di ${missingStr || 'beberapa skill'}. Rekam jejak menunjukkan kemauan belajar dan penyelesaian masalah yang baik.`,
  ({ name, expYears, jobTitle, matchedStr }) =>
    `Kandidat ${name} dengan ${expYears} tahun pengalaman menawarkan kombinasi ${matchedStr || 'keahlian umum'} yang relevan dengan ${jobTitle}. CV ringkas namun padat, menekankan kontribusi pada produk dan kerja tim. Direkomendasikan untuk proses seleksi berikutnya.`,
]

function generatePseudoSkills(id: number): string[] {
  const out: string[] = []
  for (let i = 0; i < KEYWORD_POOL.length; i++) {
    const h = hashInt(id * 1009 + i * 101) % 100
    const threshold = 40 + (hashInt(id + i) % 15)
    if (h < threshold) out.push(KEYWORD_POOL[i])
  }
  if (out.length === 0) {
    const idx = hashInt(id) % KEYWORD_POOL.length
    out.push(KEYWORD_POOL[idx])
  }
  return out
}

export function mockScreening(applicant: ApplicantInput, job: JobInput): ScreeningResult {
  const required = requiredForJob(job.title)
  const id = applicant.id

  let applicantSkills: string[]
  if (applicant.resumeKeywords && applicant.resumeKeywords.trim().length > 0) {
    applicantSkills = applicant.resumeKeywords.split(',').map(s => s.trim()).filter(Boolean)
    if (applicantSkills.length === 0) applicantSkills = generatePseudoSkills(id)
  } else {
    applicantSkills = generatePseudoSkills(id)
  }

  const lowerSet = new Set(applicantSkills.map(s => s.toLowerCase()))
  const matched: string[] = []
  const missing: string[] = []
  for (const req of required) {
    if (lowerSet.has(req.toLowerCase())) matched.push(req)
    else missing.push(req)
  }

  const skillsOverlap = required.length === 0 ? 100 : (matched.length / required.length) * 100
  const MAX_EXP_YEARS = 8
  const expYears = (hashInt(id) % MAX_EXP_YEARS) + 1
  const expFit = (expYears / MAX_EXP_YEARS) * 100
  const SKILL_WEIGHT = 0.6
  const EXP_WEIGHT = 0.4
  let raw = SKILL_WEIGHT * skillsOverlap + EXP_WEIGHT * expFit
  raw = Math.round(raw)
  const score = Math.max(0, Math.min(100, raw))
  const band = bandFor(score)

  const matchedStr = matched.join(', ')
  const missingStr = missing.join(', ')
  const templateIdx = hashString(`${id}-${job.title}`) % SUMMARY_TEMPLATES.length
  const summary = SUMMARY_TEMPLATES[templateIdx]({
    name: applicant.name,
    expYears,
    jobTitle: job.title,
    matchedStr,
    missingStr,
    band,
    score,
  })

  return { summary, score, band, matched, missing, expYears }
}
