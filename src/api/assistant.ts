import { Hono } from 'hono'
import { OrgEnv } from '../middleware/orgContext'

type FAQEntry = {
  id: string
  keywords: string[]
  question: string
  answer: string
  action?: string
}

export const faqEntries: FAQEntry[] = [
  {
    id: 'leave_balance',
    keywords: ['sisa cuti', 'cuti', 'saldo cuti', 'jatah cuti', 'sisa cuti saya'],
    question: 'Berapa sisa cuti saya tahun ini?',
    answer: 'Sisa cuti Anda tahun ini adalah 8 hari. Anda dapat mengajukan cuti melalui tombol Ajukan Cuti di bawah ini.',
    action: 'leave',
  },
  {
    id: 'reimbursement',
    keywords: ['reimbursement', 'reimburse', 'klaim biaya', 'penggantian biaya', 'klaim reimbursement'],
    question: 'Bagaimana cara mengajukan reimbursement?',
    answer: 'Untuk mengajukan reimbursement, unggah kuitansi asli melalui portal HR > Reimbursement, isi nominal dan kategori biaya, lalu tunggu persetujuan atasan. Proses pencairan maksimal 5 hari kerja.',
  },
  {
    id: 'travel',
    keywords: ['perjalanan dinas', 'dinas', 'sppd', 'perdin', 'tugas luar'],
    question: 'Bagaimana prosedur perjalanan dinas?',
    answer: 'Prosedur perjalanan dinas: ajukan SPPD di portal HR minimal 3 hari sebelum keberangkatan, lampirkan undangan atau surat tugas, dan tunggu persetujuan manajer dan HR.',
  },
  {
    id: 'payslip',
    keywords: ['slip gaji', 'gaji', 'payroll', 'slip', 'take home pay'],
    question: 'Di mana saya bisa mengunduh slip gaji?',
    answer: 'Slip gaji dapat diunduh setiap tanggal 25 melalui portal HR > Penggajian > Slip Gaji. Jika belum muncul, hubungi payroll di payroll@sirius.co.id.',
  },
  {
    id: 'sop',
    keywords: ['sop', 'kebijakan', 'prosedur', 'peraturan perusahaan', 'policy'],
    question: 'Di mana saya bisa melihat SOP dan kebijakan perusahaan?',
    answer: 'SOP dan kebijakan perusahaan tersedia di portal HR > Dokumen > Kebijakan & SOP. Dokumen diperbarui setiap kuartal dan dapat diunduh dalam format PDF.',
  },
  {
    id: 'employment_letter',
    keywords: ['surat keterangan kerja', 'surat kerja', 'paklaring', 'referensi kerja', 'employment letter'],
    question: 'Bagaimana cara meminta surat keterangan kerja?',
    answer: 'Untuk meminta surat keterangan kerja, ajukan permintaan melalui portal HR > Layanan > Surat Keterangan Kerja, isi keperluan dan tujuan surat, dan surat akan diterbitkan dalam 2 hari kerja.',
  },
  {
    id: 'work_hours',
    keywords: ['jam kerja', 'jam kantor', 'work hours', 'jadwal kerja', 'waktu kerja'],
    question: 'Berapa jam kerja di Sirius?',
    answer: 'Jam kerja di Sirius adalah Senin–Jumat pukul 09.00–18.00 WIB dengan waktu istirahat 12.00–13.00. Fleksibilitas WFH tersedia sesuai kebijakan tim.',
  },
  {
    id: 'bpjs',
    keywords: ['bpjs', 'bpjs kesehatan', 'bpjs ketenagakerjaan', 'asuransi', 'jaminan kesehatan'],
    question: 'Bagaimana kepesertaan BPJS saya?',
    answer: 'Seluruh karyawan tetap terdaftar di BPJS Kesehatan dan BPJS Ketenagakerjaan sejak hari pertama bekerja. Kartu digital dapat diakses melalui aplikasi Mobile JKN dan JMO.',
  },
  {
    id: 'onboarding',
    keywords: ['onboarding', 'karyawan baru', 'orientasi', 'induksi', 'new hire'],
    question: 'Apa proses onboarding untuk karyawan baru?',
    answer: 'Proses onboarding karyawan baru meliputi orientasi hari pertama, pengenalan tim, pembekalan tools kerja, dan pendampingan buddy selama 30 hari pertama.',
  },
  {
    id: 'performance',
    keywords: ['penilaian kinerja', 'performance', 'review kinerja', 'kpi', 'evaluasi'],
    question: 'Kapan penilaian kinerja dilakukan?',
    answer: 'Penilaian kinerja dilakukan dua kali setahun pada bulan Juni dan Desember melalui sistem HR > Kinerja. Hasil review akan didiskusikan bersama atasan langsung.',
  },
  {
    id: 'training',
    keywords: ['pelatihan', 'training', 'pengembangan', 'kursus', 'learning'],
    question: 'Bagaimana cara mendaftar pelatihan?',
    answer: 'Pendaftaran pelatihan dapat dilakukan melalui portal HR > Pengembangan > Pelatihan. Pilih program yang tersedia dan ajukan persetujuan ke atasan Anda.',
  },
  {
    id: 'hr_contact',
    keywords: ['kontak hr', 'hubungi hr', 'hr', 'human resource', 'email hr'],
    question: 'Bagaimana cara menghubungi HR?',
    answer: 'Anda dapat menghubungi HR melalui email hr@sirius.co.id, telepon ext. 100, atau datang langsung ke HR Corner lantai 3 setiap jam kerja.',
  },
]

const fallback = {
  message: 'Maaf, saya belum memiliki jawaban untuk pertanyaan tersebut. Silakan hubungi HR untuk bantuan lebih lanjut.',
  contact: 'hr@sirius.co.id / ext. 100',
}

function scoreEntry(query: string, entry: FAQEntry): number {
  const q = query.toLowerCase()
  let hits = 0
  for (const kw of entry.keywords) {
    if (q.includes(kw.toLowerCase())) hits += 1
  }
  return hits
}

export const assistantRouter = new Hono<OrgEnv>()

const PENDING_STATUS = 'menunggu persetujuan'
const MAX_LEAVE_REQUESTS = 500

let leaveCounter = 1024
type LeaveRequest = {
  reference: string
  ownerUserId: string
  organizationId: number
  type?: string
  startDate?: string
  endDate?: string
  note?: string
  status: string
  createdAt: string
}
const leaveRequests: LeaveRequest[] = []

assistantRouter.get('/answer', (c) => {
  const q = c.req.query('q') ?? ''
  const trimmed = q.trim()
  if (!trimmed) {
    return c.json({ matched: false, fallback })
  }
  let best: FAQEntry | null = null
  let bestScore = 0
  for (const entry of faqEntries) {
    const s = scoreEntry(trimmed, entry)
    if (s > bestScore) {
      bestScore = s
      best = entry
    }
  }
  if (best && bestScore >= 1) {
    const res: Record<string, unknown> = {
      matched: true,
      entryId: best.id,
      question: best.question,
      answer: best.answer,
    }
    if (best.action) res.action = best.action
    return c.json(res)
  }
  return c.json({ matched: false, fallback })
})

assistantRouter.post('/leave', async (c) => {
  const user = c.get('user')
  const organizationId = c.get('orgId')

  let body: Record<string, unknown> = {}
  try {
    body = await c.req.json()
  } catch {
    body = {}
  }
  const type = typeof body.type === 'string' ? body.type : undefined
  const startDate = typeof body.startDate === 'string' ? body.startDate : undefined
  const endDate = typeof body.endDate === 'string' ? body.endDate : undefined
  const note = typeof body.note === 'string' ? body.note : undefined

  const reference = `CUTI-2026-${String(leaveCounter).padStart(4, '0')}`
  leaveCounter += 1

  const entry: LeaveRequest = {
    reference,
    ownerUserId: user.id,
    organizationId,
    type,
    startDate,
    endDate,
    note,
    status: PENDING_STATUS,
    createdAt: new Date().toISOString(),
  }

  if (leaveRequests.length >= MAX_LEAVE_REQUESTS) {
    leaveRequests.shift()
  }
  leaveRequests.push(entry)

  return c.json({ success: true, reference, status: PENDING_STATUS }, 201)
})

assistantRouter.get('/requests', (c) => {
  const user = c.get('user')
  const organizationId = c.get('orgId')
  const visible = leaveRequests
    .filter((request) => request.ownerUserId === user.id && request.organizationId === organizationId)
    .map(({ ownerUserId: _ownerUserId, organizationId: _organizationId, ...rest }) => rest)
  return c.json({ requests: visible })
})

// Utility for tests to reset state if needed (not exposed as route)
export function _resetAssistantState() {
  leaveCounter = 1024
  leaveRequests.length = 0
}
