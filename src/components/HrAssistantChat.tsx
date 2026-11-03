import React, { useEffect, useRef, useState } from 'react'

interface HrAssistantChatProps {
  onBack: () => void
}

type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  text: string
  action?: 'leave'
  contact?: { name: string; phone?: string; email?: string; hours?: string }
  reference?: string
  kind?: 'fallback' | 'reference' | 'request-list' | 'error'
  requests?: LeaveRequest[]
}

type LeaveRequest = {
  id?: string | number
  reference?: string
  startDate?: string
  endDate?: string
  start_date?: string
  end_date?: string
  status?: string
  created_at?: string
  createdAt?: string
}

const QUICK_QUESTIONS = [
  'Berapa sisa cuti saya tahun ini?',
  'Bagaimana cara klaim reimbursement?',
  'Kapan slip gaji dikirim?',
  'Prosedur dinas luar kota?',
]

let uid = 0
function nextId() {
  uid += 1
  return `msg-${Date.now()}-${uid}`
}

export const HrAssistantChat: React.FC<HrAssistantChatProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: nextId(),
      role: 'assistant',
      text: 'Halo! Saya Asisten HR TalentHub. Anda dapat menanyakan informasi cuti, reimbursement, jadwal slip gaji, atau prosedur operasional HR lainnya.',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showDateFormFor, setShowDateFormFor] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [showRequests, setShowRequests] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDateFormFor) setShowDateFormFor(null)
        else onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, showDateFormFor])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, showDateFormFor, sending])

  const pushError = (query: string) => {
    const errMsg: ChatMsg = {
      id: nextId(),
      role: 'assistant',
      text: `Maaf, layanan asisten belum tersedia (backend tidak merespons untuk "${query}"). Coba lagi, atau hubungi HR di hr@sirius.co.id / 021-5090-0000.`,
      kind: 'error',
    }
    setMessages((prev) => [...prev, errMsg])
  }

  const handleSend = async (textOverride?: string) => {
    const q = (textOverride ?? input).trim()
    if (!q || sending) return
    setInput('')
    const userMsg: ChatMsg = { id: nextId(), role: 'user', text: q }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)
    try {
      const res = await fetch(`/api/assistant/answer?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json() as any)
      // normalize shapes: { answer, action, fallback, contact, reference } or { text, ... }
      const answerText: string = data.answer ?? data.text ?? data.message ?? ''
      const hasAction: boolean = data.action === 'leave' || data.action === 'Ajukan Cuti' || data.showLeaveButton === true || (typeof answerText === 'string' && answerText.includes('8 hari') && !data.fallback)
      const isFallback: boolean = Boolean(data.fallback) || data.matched === false || answerText.toLowerCase().includes('hubungi hr')
      const contact = data.contact ?? (isFallback ? { name: 'HR PT. Sirius Global Technologies', email: 'hr@sirius.co.id', phone: '021-5090-0000', hours: 'Senin–Jumat 09:00–17:00 WIB' } : undefined)

      // Heuristic: flyer thread - if question contains cuti -> ensure action
      const isCuti = /cuti|sisa cuti/i.test(q)
      const shouldShowLeave = hasAction || (isCuti && !isFallback && answerText.includes('8'))

      // if backend returns no answer but is 200, treat as fallback with contact card
      if (!answerText) {
        const fb: ChatMsg = {
          id: nextId(),
          role: 'assistant',
          text: 'Maaf, saya belum memiliki jawaban untuk itu. Silakan hubungi HR untuk bantuan lebih lanjut.',
          kind: 'fallback',
          contact: { name: 'HR PT. Sirius Global Technologies', email: 'hr@sirius.co.id', phone: '021-5090-0000', hours: 'Senin–Jumat 09:00–17:00 WIB' },
        }
        setMessages((prev) => [...prev, fb])
      } else if (isFallback) {
        const fb: ChatMsg = {
          id: nextId(),
          role: 'assistant',
          text: answerText,
          kind: 'fallback',
          contact,
        }
        setMessages((prev) => [...prev, fb])
      } else {
        const assistantMsg: ChatMsg = {
          id: nextId(),
          role: 'assistant',
          text: answerText,
          action: shouldShowLeave ? 'leave' : undefined,
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch {
      pushError(q)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleLeaveSubmit = async (msgId: string) => {
    if (!startDate || !endDate) return
    setLeaveSubmitting(true)
    try {
      const res = await fetch('/api/assistant/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json() as any)
      const reference: string = data.reference ?? data.ref ?? data.id ?? `CUTI-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`
      const msg = data.message ?? `Pengajuan cuti ${startDate} s/d ${endDate} berhasil.`
      const refMsg: ChatMsg = {
        id: nextId(),
        role: 'assistant',
        text: `${msg} Nomor referensi: ${reference}. Status akan muncul di "Permintaan saya".`,
        reference,
        kind: 'reference',
      }
      setMessages((prev) => [...prev, refMsg])
      setShowDateFormFor(null)
      setStartDate('')
      setEndDate('')
      // fetch updated requests in background
      fetchRequests()
    } catch {
      const errMsg: ChatMsg = {
        id: nextId(),
        role: 'assistant',
        text: 'Gagal mengajukan cuti, backend tidak merespons. Coba lagi atau hubungi HR.',
        kind: 'error',
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLeaveSubmitting(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/assistant/requests')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json() as any)
      const list: LeaveRequest[] = Array.isArray(data) ? data : data.requests ?? data.data ?? []
      setRequests(list)
      setShowRequests(true)
      // also push a bubble summarizing if not already
      if (list.length > 0) {
        const summary: ChatMsg = {
          id: nextId(),
          role: 'assistant',
          text: `Kamu memiliki ${list.length} permintaan cuti pada sesi ini.`,
          kind: 'request-list',
          requests: list,
        }
        setMessages((prev) => [...prev, summary])
      } else {
        const empty: ChatMsg = {
          id: nextId(),
          role: 'assistant',
          text: 'Belum ada permintaan cuti pada sesi ini. Ajukan cuti melalui tombol Ajukan Cuti di atas.',
          kind: 'request-list',
          requests: [],
        }
        setMessages((prev) => [...prev, empty])
      }
    } catch {
      const errMsg: ChatMsg = {
        id: nextId(),
        role: 'assistant',
        text: 'Tidak dapat memuat daftar permintaan, backend tidak merespons. Coba lagi nanti.',
        kind: 'error',
      }
      setMessages((prev) => [...prev, errMsg])
    }
  }

  const handleRetryLast = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) handleSend(lastUser.text)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 2 }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            aria-label="Kembali ke hub"
            onClick={onBack}
            style={{
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#334155',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Layanan Asisten HR
              </h1>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488', background: '#CCFBF1', border: '1px solid #99F6E4', padding: '2px 7px', borderRadius: '999px', letterSpacing: '0.04em' }}>
                HR Helpdesk
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Pusat informasi kebijakan internal & layanan mandiri karyawan</p>
          </div>
          <button
            type="button"
            aria-label="Lihat permintaan saya"
            onClick={fetchRequests}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '7px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Permintaan saya
          </button>
        </div>
      </div>

      {/* Thread */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 16px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Quick chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                aria-label={`Tanya: ${q}`}
                onClick={() => handleSend(q)}
                disabled={sending}
                style={{
                  background: 'white',
                  border: '1px solid #CBD5E1',
                  padding: '7px 12px',
                  borderRadius: '999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {m.role === 'assistant' && (
                <div
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#0D9488',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  HR
                </div>
              )}
              <div
                style={{
                  maxWidth: '78%',
                  background: m.role === 'user' ? '#0D9488' : m.kind === 'error' ? '#FEF2F2' : m.kind === 'fallback' ? '#FFFBEB' : 'white',
                  color: m.role === 'user' ? 'white' : m.kind === 'error' ? '#991B1B' : '#1E293B',
                  border: `1px solid ${m.role === 'user' ? '#0F766E' : m.kind === 'error' ? '#FECACA' : m.kind === 'fallback' ? '#FDE68A' : '#E2E8F0'}`,
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '11px 14px',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  wordBreak: 'break-word',
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                {m.kind === 'error' && (
                  <button
                    type="button"
                    onClick={handleRetryLast}
                    style={{
                      marginTop: '10px',
                      background: 'white',
                      border: '1px solid #FECACA',
                      color: '#DC2626',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Coba lagi
                  </button>
                )}

                {m.contact && (
                  <div
                    style={{
                      marginTop: '10px',
                      background: 'white',
                      border: '1px solid #FDE68A',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '12.5px',
                      color: '#92400E',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#78350F', marginBottom: '4px' }}>Hubungi HR</div>
                    <div>{m.contact.name}</div>
                    {m.contact.email && <div>Email: {m.contact.email}</div>}
                    {m.contact.phone && <div>Telp: {m.contact.phone}</div>}
                    {m.contact.hours && <div style={{ color: '#A16207', fontSize: '12px' }}>{m.contact.hours}</div>}
                  </div>
                )}

                {m.reference && (
                  <div
                    style={{
                      marginTop: '10px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D' }}>Referensi:</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.02em' }}>{m.reference}</span>
                  </div>
                )}

                {m.kind === 'request-list' && m.requests && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {m.requests.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#64748B' }}>Belum ada pengajuan pada sesi ini.</span>
                    ) : (
                      m.requests.map((r, idx) => {
                        const ref = r.reference ?? (r as any).ref ?? `REQ-${idx + 1}`
                        const sd = r.startDate ?? r.start_date ?? '-'
                        const ed = r.endDate ?? r.end_date ?? '-'
                        return (
                          <div key={`${ref}-${idx}`} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 10px', fontSize: '12.5px', color: '#334155' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{ref}</div>
                            <div style={{ color: '#64748B' }}>
                              {sd} → {ed}
                              {r.status ? ` · ${r.status}` : ''}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {m.action === 'leave' && (
                  <div style={{ marginTop: '10px' }}>
                    {showDateFormFor === m.id ? (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Konfirmasi tanggal cuti</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <label style={{ flex: 1, minWidth: '140px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            Tanggal mulai
                            <input
                              type="date"
                              aria-label="Tanggal mulai cuti"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              style={{ padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: 'white' }}
                            />
                          </label>
                          <label style={{ flex: 1, minWidth: '140px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            Tanggal selesai
                            <input
                              type="date"
                              aria-label="Tanggal selesai cuti"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{ padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: 'white' }}
                            />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setShowDateFormFor(null)}
                            style={{ padding: '7px 12px', background: '#F1F5F9', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            aria-label="Konfirmasi ajukan cuti"
                            onClick={() => handleLeaveSubmit(m.id)}
                            disabled={!startDate || !endDate || leaveSubmitting}
                            style={{
                              padding: '7px 14px',
                              background: !startDate || !endDate || leaveSubmitting ? '#94A3B8' : '#0D9488',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: !startDate || !endDate || leaveSubmitting ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {leaveSubmitting ? 'Mengirim...' : 'Konfirmasi'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label="Ajukan cuti"
                        onClick={() => setShowDateFormFor(m.id)}
                        style={{
                          background: '#0D9488',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '999px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(13,148,136,0.25)',
                        }}
                      >
                        Ajukan Cuti
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0D9488', color: 'white', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                HR
              </div>
              <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px 16px 16px 4px', padding: '11px 14px', fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>
                Mengetik...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div style={{ background: 'white', borderTop: '1px solid #E2E8F0', padding: '12px 16px', position: 'sticky', bottom: 0 }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            aria-label="Ketik pertanyaan HR"
            placeholder="Ketik pertanyaan, mis. Berapa sisa cuti saya tahun ini?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            style={{
              flex: 1,
              padding: '11px 14px',
              border: '1px solid #CBD5E1',
              borderRadius: '999px',
              fontSize: '14px',
              background: 'white',
            }}
          />
          <button
            type="button"
            aria-label="Kirim pertanyaan"
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: !input.trim() || sending ? '#94A3B8' : '#0D9488',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            <span aria-hidden="true">↑</span>
          </button>
        </div>
        <div style={{ maxWidth: '640px', margin: '12px auto 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Tekan Enter untuk kirim • Esc untuk kembali ke hub</span>
          {showRequests && (
            <button
              type="button"
              onClick={() => setShowRequests(false)}
              style={{ fontSize: '11px', color: '#64748B', background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Sembunyikan daftar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
