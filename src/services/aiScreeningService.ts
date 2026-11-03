import { bandFor, verdictFor, KEYWORD_POOL } from '../api/screening'

export interface AIEvaluationResult {
  score: number
  summary: string
  matchedSkills: string[]
  missingSkills: string[]
  expYears: number
  verdict: 'Hire' | 'Consider' | 'Pass'
  band: 'Strong' | 'Potential' | 'Weak'
  provider: 'smart-heuristic' | 'gemini' | 'openai'
}

export interface EvaluateResumeOptions {
  applicantText?: string
  resumeBuffer?: Buffer
  jobTitle: string
  jobRequirements?: string[] | string
  applicantName?: string
}

/**
 * Extracts raw textual content from buffer (PDF or text) or string.
 * Supports basic PDF text stream parsing (extracting text inside parentheses in BT...ET blocks)
 * and plain UTF-8 text fallback.
 */
export function extractTextFromBuffer(buffer: Buffer): string {
  const rawStr = buffer.toString('utf-8')

  // Check if buffer is PDF
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
    const textPieces: string[] = []

    // 1. Regex to extract text inside PDF text showing operators: (Some text) Tj or [(Some) (text)] TJ
    // Matches parentheses content: \(([^)]+)\)
    const parenMatches = rawStr.match(/\(([^()]{1,200})\)\s*(?:Tj|'|")/g)
    if (parenMatches && parenMatches.length > 0) {
      for (const m of parenMatches) {
        const text = m.replace(/^[(\s]+/, '').replace(/[)\s'"]+$/, '')
        if (text.length > 0 && !/^[\x00-\x1F]+$/.test(text)) {
          textPieces.push(text)
        }
      }
    }

    // 2. Also search for text within stream blocks if uncompressed or simple text
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g
    let match: RegExpExecArray | null
    while ((match = streamRegex.exec(rawStr)) !== null) {
      const streamContent = match[1]
      // Search for TJ arrays: [ (Text1) 123 (Text2) ] TJ
      const tjMatches = streamContent.match(/\[(.*?)\]\s*TJ/g)
      if (tjMatches) {
        for (const tj of tjMatches) {
          const innerStrings = tj.match(/\(([^()]+)\)/g)
          if (innerStrings) {
            for (const s of innerStrings) {
              const cleaned = s.slice(1, -1)
              if (cleaned.length > 0 && !/^[\x00-\x1F]+$/.test(cleaned)) {
                textPieces.push(cleaned)
              }
            }
          }
        }
      }
    }

    if (textPieces.length > 0) {
      return textPieces.join(' ')
    }

    // Fallback for PDF: filter printable ASCII strings from buffer
    const asciiStrings: string[] = []
    let currentStr = ''
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i]
      // Printable ASCII (space to ~) or newline
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
        currentStr += String.fromCharCode(byte)
      } else {
        if (currentStr.trim().length >= 4) {
          // Avoid PDF syntax tokens
          if (!currentStr.startsWith('/') && !currentStr.includes('obj') && !currentStr.includes('endobj')) {
            asciiStrings.push(currentStr.trim())
          }
        }
        currentStr = ''
      }
    }
    if (asciiStrings.length > 0) {
      return asciiStrings.join(' ')
    }
  }

  // Not a PDF or standard text/plain
  return rawStr
}

/**
 * Intelligent rule-based semantic extraction fallback
 */
export function evaluateWithSmartHeuristics(
  text: string,
  jobTitle: string,
  applicantName: string = 'Kandidat',
  jobRequirements?: string[] | string
): AIEvaluationResult {
  const lowerText = text.toLowerCase()

  // 1. Identify skills found in text
  const detectedSkills = KEYWORD_POOL.filter(kw => lowerText.includes(kw.toLowerCase()))

  // 2. Determine required skills based on job title or explicit requirements
  let reqSkills: string[] = []
  if (Array.isArray(jobRequirements) && jobRequirements.length > 0) {
    reqSkills = jobRequirements
  } else if (typeof jobRequirements === 'string' && jobRequirements.trim().length > 0) {
    reqSkills = jobRequirements.split(',').map(s => s.trim()).filter(Boolean)
  } else {
    const t = jobTitle.toLowerCase()
    if (t.includes('frontend') || t.includes('front-end') || t.includes('react')) {
      reqSkills = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Git', 'CI/CD']
    } else if (t.includes('backend') || t.includes('back-end') || t.includes('api')) {
      reqSkills = ['Node.js', 'TypeScript', 'SQL', 'PostgreSQL', 'Docker', 'Git']
    } else if (t.includes('fullstack') || t.includes('full-stack')) {
      reqSkills = ['React', 'Node.js', 'TypeScript', 'SQL', 'Git', 'Docker']
    } else if (t.includes('designer') || t.includes('ui') || t.includes('ux') || t.includes('product design')) {
      reqSkills = ['Figma', 'UI/UX', 'Product Design', 'Agile']
    } else if (t.includes('devops') || t.includes('sre') || t.includes('cloud')) {
      reqSkills = ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD', 'Git']
    } else {
      reqSkills = ['JavaScript', 'TypeScript', 'Git', 'SQL', 'Agile']
    }
  }

  const detectedSet = new Set(detectedSkills.map(s => s.toLowerCase()))
  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  for (const req of reqSkills) {
    if (detectedSet.has(req.toLowerCase())) {
      matchedSkills.push(req)
    } else {
      missingSkills.push(req)
    }
  }

  // Also include any strong matches found in text that weren't explicitly listed in reqSkills
  for (const s of detectedSkills) {
    if (!matchedSkills.includes(s) && matchedSkills.length < 8) {
      matchedSkills.push(s)
    }
  }

  // 3. Extract experience years (e.g. "5 years of experience", "pengalaman 3 tahun", "2019 - 2024")
  let expYears = 2 // default baseline
  const expMatch = lowerText.match(/(\d{1,2})\+?\s*(?:tahun|thn|years|year|yrs|yr)\s*(?:pengalaman|experience)?/i)
    || lowerText.match(/(?:pengalaman|experience)[:\s]+(\d{1,2})\s*(?:tahun|thn|years|year|yrs|yr)/i)

  if (expMatch && expMatch[1]) {
    const parsed = parseInt(expMatch[1], 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 30) {
      expYears = parsed
    }
  } else {
    // Check year ranges like 2018 - 2023
    const yearRangeMatches = lowerText.match(/\b(201\d|202\d)\s*[-–—to]\s*(202\d|present|sekarang)\b/g)
    if (yearRangeMatches && yearRangeMatches.length > 0) {
      expYears = Math.min(10, Math.max(1, yearRangeMatches.length * 2))
    }
  }

  // 4. Calculate score
  const skillsRatio = reqSkills.length === 0 ? 1 : matchedSkills.filter(m => reqSkills.some(r => r.toLowerCase() === m.toLowerCase())).length / reqSkills.length
  const expRatio = Math.min(1, expYears / 5) // 5+ years = full exp points
  
  // Base score 40 + up to 45 for skills + up to 15 for exp
  let rawScore = Math.round(35 + (skillsRatio * 45) + (expRatio * 20))
  if (matchedSkills.length === 0) {
    rawScore = Math.min(rawScore, 45)
  }
  const score = Math.max(10, Math.min(98, rawScore))

  const band = (bandFor(score) as 'Strong' | 'Potential' | 'Weak')
  const verdict = (verdictFor(band) as 'Hire' | 'Consider' | 'Pass')

  let summary = ''
  if (verdict === 'Hire') {
    summary = `${applicantName} memiliki ${expYears} tahun pengalaman dengan kecocokan keahlian yang sangat kuat pada posisi ${jobTitle}. Menguasai ${matchedSkills.slice(0, 4).join(', ')}. Profil sangat direkomendasikan untuk wawancara teknis.`
  } else if (verdict === 'Consider') {
    summary = `${applicantName} membawa ${expYears} tahun pengalaman yang relevan untuk posisi ${jobTitle}. Menguasai ${matchedSkills.slice(0, 3).join(', ') || 'dasar teknis'}, namun masih perlu verifikasi lebih lanjut untuk keahlian ${missingSkills.slice(0, 2).join(', ') || 'spesifik'}.`
  } else {
    summary = `Kandidat ${applicantName} saat ini belum memenuhi kualifikasi utama untuk posisi ${jobTitle}. Keahlian yang belum terlihat meliputi ${missingSkills.slice(0, 3).join(', ') || 'kebutuhan inti peran ini'}.`
  }

  return {
    score,
    summary,
    matchedSkills,
    missingSkills,
    expYears,
    verdict,
    band,
    provider: 'smart-heuristic'
  }
}

/**
 * Call real LLM (Gemini / OpenAI compatible) if API keys are configured
 */
export async function evaluateWithLLM(
  text: string,
  jobTitle: string,
  applicantName: string = 'Kandidat',
  jobRequirements?: string[] | string
): Promise<AIEvaluationResult | null> {
  const geminiKey = process.env.GEMINI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!geminiKey && !openaiKey) {
    return null
  }

  const prompt = `Anda adalah seorang Senior Talent Acquisition & Engineering Hiring Manager.
Lakukan evaluasi screening kualifikasi CV pelamar secara objektif terhadap posisi pekerjaan berikut.

Posisi Pekerjaan: ${jobTitle}
Persyaratan / Ekspektasi: ${Array.isArray(jobRequirements) ? jobRequirements.join(', ') : (jobRequirements || 'Standar industri untuk ' + jobTitle)}
Nama Pelamar: ${applicantName}

Konten Resume / CV:
"""
${text.slice(0, 6000)}
"""

Kembalikan respons HANYA dalam format JSON valid tanpa markdown formatting (tanpa \`\`\`json):
{
  "score": number, // 0 - 100
  "summary": "Analisis ringkas 2-3 kalimat mengenai kecocokan pelamar dalam Bahasa Indonesia profesional",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "expYears": number,
  "verdict": "Hire" | "Consider" | "Pass",
  "band": "Strong" | "Potential" | "Weak"
}`

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json'
            }
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawContent) {
          const parsed = JSON.parse(rawContent.trim())
          const band = (parsed.score >= 75 ? 'Strong' : parsed.score >= 50 ? 'Potential' : 'Weak') as 'Strong' | 'Potential' | 'Weak'
          const verdict = (parsed.verdict || (band === 'Strong' ? 'Hire' : band === 'Potential' ? 'Consider' : 'Pass')) as 'Hire' | 'Consider' | 'Pass'
          return {
            score: Math.max(0, Math.min(100, Math.round(parsed.score))),
            summary: parsed.summary || '',
            matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
            missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
            expYears: typeof parsed.expYears === 'number' ? parsed.expYears : 1,
            verdict,
            band,
            provider: 'gemini'
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API evaluation failed, falling back:', err)
    }
  }

  // 2. Try OpenAI
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      })

      if (response.ok) {
        const data = await response.json()
        const rawContent = data.choices?.[0]?.message?.content
        if (rawContent) {
          const parsed = JSON.parse(rawContent.trim())
          const band = (parsed.score >= 75 ? 'Strong' : parsed.score >= 50 ? 'Potential' : 'Weak') as 'Strong' | 'Potential' | 'Weak'
          const verdict = (parsed.verdict || (band === 'Strong' ? 'Hire' : band === 'Potential' ? 'Consider' : 'Pass')) as 'Hire' | 'Consider' | 'Pass'
          return {
            score: Math.max(0, Math.min(100, Math.round(parsed.score))),
            summary: parsed.summary || '',
            matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
            missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
            expYears: typeof parsed.expYears === 'number' ? parsed.expYears : 1,
            verdict,
            band,
            provider: 'openai'
          }
        }
      }
    } catch (err) {
      console.warn('OpenAI API evaluation failed, falling back:', err)
    }
  }

  return null
}

/**
 * Main evaluation entry point
 */
export async function evaluateResume(options: EvaluateResumeOptions): Promise<AIEvaluationResult> {
  let text = options.applicantText || ''
  if (!text && options.resumeBuffer) {
    text = extractTextFromBuffer(options.resumeBuffer)
  }

  // If text is still empty, provide minimal indicator
  if (!text.trim()) {
    text = 'Resume dokumen terunggah tanpa teks terbaca.'
  }

  // Attempt real LLM evaluation if available
  const llmResult = await evaluateWithLLM(
    text,
    options.jobTitle,
    options.applicantName,
    options.jobRequirements
  )

  if (llmResult) {
    return llmResult
  }

  // Fallback to intelligent rule-based semantic heuristic engine
  return evaluateWithSmartHeuristics(
    text,
    options.jobTitle,
    options.applicantName,
    options.jobRequirements
  )
}
