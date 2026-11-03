export interface CandidateSummaryData {
  candidateName: string
  appliedRole: string
  appliedDate: string
  score?: number | null
  verdict?: 'Hire' | 'Consider' | 'Pass' | string | null
  summary?: string | null
  matchedSkills?: string[]
  missingSkills?: string[]
  expYears?: number | null
  interviewQuestions?: string[]
}

/**
 * Generates relevant interview questions based on missing skills or gaps.
 */
export function generateInterviewQuestions(missingSkills: string[] = [], roleName: string = 'posisi ini'): string[] {
  if (!missingSkills || missingSkills.length === 0) {
    return [
      `Bagaimana pendekatan Anda dalam memimpin proyek teknis end-to-end terkait ${roleName}?`,
      `Ceritakan pengalaman paling menantang yang pernah Anda selesaikan dan dampaknya bagi bisnis.`,
      `Bagaimana cara Anda menjaga standar kualitas kode dan arsitektur dalam tim?`
    ]
  }

  const questions: string[] = []
  for (const skill of missingSkills.slice(0, 3)) {
    questions.push(
      `Berdasarkan review CV, Anda belum banyak mencantumkan pengalaman dengan ${skill}. Bagaimana pemahaman atau pengalaman praktis Anda terkait ${skill}?`
    )
  }

  if (questions.length < 3) {
    questions.push(
      `Bagaimana strategi Anda untuk cepat beradaptasi dan menguasai teknologi baru yang dibutuhkan untuk ${roleName}?`
    )
  }

  return questions
}

/**
 * Formats structured candidate intelligence summary into clean, bolded markdown
 * ideal for WhatsApp or Slack sharing with Hiring Managers.
 */
export function formatWhatsAppSummary(data: CandidateSummaryData): string {
  const verdictText = data.verdict ? ` (${data.verdict})` : ''
  const scoreText = data.score != null ? `${data.score}/100${verdictText}` : 'Belum di-screening'
  const matched = (data.matchedSkills && data.matchedSkills.length > 0)
    ? data.matchedSkills.join(', ')
    : '-'
  const missing = (data.missingSkills && data.missingSkills.length > 0)
    ? data.missingSkills.join(', ')
    : 'Tidak ada gap signifikan'
  const summary = data.summary?.trim() || 'Evaluasi kualifikasi belum tersedia.'
  const questions = (data.interviewQuestions && data.interviewQuestions.length > 0)
    ? data.interviewQuestions
    : generateInterviewQuestions(data.missingSkills, data.appliedRole)

  const questionsFormatted = questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')

  return `*Ringkasan Kandidat - ${data.candidateName}*
Posisi: ${data.appliedRole}
Tanggal Melamar: ${data.appliedDate}
Skor Kecocokan AI: ${scoreText}
${data.expYears != null ? `Pengalaman: ${data.expYears} tahun\n` : ''}
*Ringkasan Eksekutif AI:*
${summary}

*Keahlian Utama yang Cocok:*
${matched}

*Keahlian yang Perlu Dieksplorasi (Gap):*
${missing}

*Rekomendasi Pertanyaan Wawancara:*
${questionsFormatted}

_Dibuat otomatis via TalentHub Talent Intelligence_`
}
