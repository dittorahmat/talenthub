import React, { useState, useEffect, useRef, useCallback } from 'react'
import { orgFetch } from '../context/OrgContext'

export interface InboxItem {
  id: number | string
  filename: string
  status: string
  name?: string
  email?: string
  phone?: string
  score?: number
  band?: string
  verdict?: string
  rationale?: string
  matched?: string[] | string
  missing?: string[] | string
  knockoutFailed?: boolean
  knockoutFailedQuestion?: string
  knockout_failed?: boolean
  knockout_question?: string
  duplicateOf?: number | string | null
  duplicate_of?: number | string | null
  promotedApplicantId?: number | string | null
  promoted_applicant_id?: number | string | null
  error?: string
  reason?: string
  summary?: string
}

interface ScreeningInboxProps {
  jobId: number
  jobTitle: string
  onBack: () => void
  onPromoted: () => void
}

function deriveVerdict(band?: string, verdict?: string): string | null {
  if (verdict) {
    const v = verdict.toLowerCase()
    if (v === 'hire' || v === 'consider' || v === 'pass') return verdict.charAt(0).toUpperCase() + verdict.slice(1).toLowerCase()
  }
  if (!band) return null
  const b = band.toLowerCase()
  if (b === 'strong') return 'Hire'
  if (b === 'potential') return 'Consider'
  return 'Pass'
}

function verdictStyle(verdict?: string | null): React.CSSProperties {
  const v = (verdict || '').toLowerCase()
  if (v === 'hire') return { color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0' }
  if (v === 'consider') return { color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A' }
  // Pass
  return { color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0' }
}

function parseChips(val: string | string[] | undefined): string[] {
  if (!val) return []
  if (Array.isArray(val)) return (val as string[]).map(s => String(s).trim()).filter(Boolean)
  return String(val).split(',').map(s => s.trim()).filter(Boolean)
}

function getItemStatus(item: InboxItem): string {
  return String(item.status || '').toLowerCase()
}

export const ScreeningInbox: React.FC<ScreeningInboxProps> = ({ jobId, jobTitle, onBack, onPromoted }) => {
  const [items, setItems] = useState<InboxItem[]>([])
  const [knockouts, setKnockouts] = useState<{ id: number | string; question: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollCountRef = useRef(0)
  const pollTimerRef = useRef<number | null>(null)

  // promote inline edit state
  const [promoteState, setPromoteState] = useState<Record<string, { name: string; email: string; show: boolean; saving?: boolean }>>({})

  const fetchInbox = useCallback(async () => {
    try {
      const res = await orgFetch(`/api/jobs/${jobId}/inbox`)
      if (!res.ok) {
        if (res.status === 404) {
          setItems([])
          setKnockouts([])
          setError(null)
          return
        }
        throw new Error(`Gagal memuat inbox (${res.status})`)
      }
      const data = (await res.json() as any)
      // defensive shape handling
      const rawItems: InboxItem[] = Array.isArray(data) ? data : data.items || data.data || []
      setItems(Array.isArray(rawItems) ? rawItems : [])
      const rawKOs = data.knockouts || data.knockoutQuestions || []
      if (Array.isArray(rawKOs)) setKnockouts(rawKOs)
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat inbox')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  // polling while any item is queued/parsing
  useEffect(() => {
    const hasPending = items.some(it => {
      const s = getItemStatus(it)
      return s === 'queued' || s === 'parsing' || s === 'processing'
    })
    if (!hasPending) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      pollCountRef.current = 0
      return
    }
    if (pollTimerRef.current) return
    pollCountRef.current = 0
    pollTimerRef.current = window.setInterval(async () => {
      pollCountRef.current += 1
      if (pollCountRef.current > 20) {
        if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
        return
      }
      await fetchInbox()
      // stop check will happen on next effect cycle via items change
    }, 1500)
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [items, fetchInbox])

  // pre-flight confirmation modal state
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [preflightData, setPreflightData] = useState<{ required: number; current: number; shortage: number; allowed: boolean } | null>(null)
  const [showPreflightModal, setShowPreflightModal] = useState(false)

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    if (arr.length === 0) return
    setUploadError(null)

    // Pre-flight check via API before accepting
    try {
      const pfRes = await orgFetch(`/api/jobs/${jobId}/inbox/preflight?count=${arr.length}`)
      if (pfRes.ok) {
        const pf: any = await pfRes.json()
        setPendingFiles(arr)
        setPreflightData(pf)
        setShowPreflightModal(true)
        return
      }
    } catch {}

    // Fallback direct execution if preflight check unavailable
    executeBatchUpload(arr)
  }

  const executeBatchUpload = async (arr: File[]) => {
    setShowPreflightModal(false)
    setUploading(true)
    try {
      const fd = new FormData()
      arr.forEach(f => fd.append('files', f))
      const res = await orgFetch(`/api/jobs/${jobId}/inbox`, {
        method: 'POST',
        body: fd
      })
      if (!res.ok) {
        let errorMsg = `Upload gagal (${res.status})`
        try {
          const json = (await res.json() as any)
          if (json.message) errorMsg = json.message
        } catch {}
        throw new Error(errorMsg)
      }
      // trigger balance update
      window.dispatchEvent(new Event('walletChanged'))
      await fetchInbox()
      pollCountRef.current = 0
    } catch (e: any) {
      setUploadError(e?.message || 'Upload gagal')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setPendingFiles([])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  const handleDismiss = async (item: InboxItem) => {
    try {
      await orgFetch(`/api/inbox/${item.id}/dismiss`, { method: 'POST' })
      await fetchInbox()
    } catch (e) {
      console.error(e)
      await fetchInbox()
    }
  }

  const handlePromoteConfirm = async (item: InboxItem) => {
    const st = promoteState[String(item.id)]
    if (!st) return
    setPromoteState(prev => ({ ...prev, [String(item.id)]: { ...st, saving: true } }))
    try {
      const res = await orgFetch(`/api/inbox/${item.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: st.name.trim(), email: st.email.trim() })
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `Promote gagal (${res.status})`)
      }
      setPromoteState(prev => {
        const n = { ...prev }
        delete n[String(item.id)]
        return n
      })
      await fetchInbox()
      onPromoted()
    } catch (e: any) {
      setUploadError(e?.message || 'Gagal promote')
      setPromoteState(prev => ({ ...prev, [String(item.id)]: { ...st, saving: false } }))
    }
  }

  const startPromote = (item: InboxItem) => {
    const fallbackName = item.name || (item.filename ? item.filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ') : '')
    setPromoteState(prev => ({
      ...prev,
      [String(item.id)]: { name: fallbackName || '', email: item.email || '', show: true }
    }))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px' }}>
      <style>{`@keyframes ch-shimmer { 0% { opacity: 0.55; } 50% { opacity: 1; } 100% { opacity: 0.55; } } @media (prefers-reduced-motion: reduce) { [data-ch-shimmer] { animation: none !important; } }`}</style>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            aria-label="Kembali ke dashboard"
            onClick={onBack}
            style={{ background: 'white', border: '1px solid #CBD5E1', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            ← Kembali
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Screening Inbox (Demo) — {jobTitle}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
              Drop CV di bawah, lihat triase live, lalu promote ke Applied. Semua skor & verdict adalah simulasi demo.
            </p>
          </div>
        </div>

        {/* Knockouts info */}
        {knockouts.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Knockout checks (Demo)</div>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              {knockouts.map(k => (
                <li key={String(k.id)} style={{ fontSize: '12px', color: '#64748B' }}>{k.question}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload CV dropzone, klik atau drop file PDF DOCX TXT"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
          style={{
            background: dragOver ? '#F0FDFA' : 'white',
            border: `2px dashed ${dragOver ? '#0D9488' : '#CBD5E1'}`,
            borderRadius: '12px',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '16px'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            onChange={e => { if (e.target.files) handleFiles(e.target.files) }}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            {uploading ? 'Mengunggah...' : 'Drop CV di sini atau klik untuk pilih file (Demo)'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            PDF, DOCX, TXT · maksimal 5MB per file · bisa multi-file
          </div>
          {uploadError && <div style={{ marginTop: '10px', fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>{uploadError}</div>}
        </div>

        {/* Loading / Error / Empty */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            Memuat inbox...
          </div>
        ) : error ? (
          <div style={{ padding: '16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#991B1B', fontSize: '13px' }}>
            {error}{' '}
            <button type="button" onClick={() => { setLoading(true); fetchInbox() }} style={{ marginLeft: '8px', background: 'white', border: '1px solid #FECACA', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>Coba lagi</button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Belum ada CV di inbox</div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Drop berkas CV di atas untuk memulai verifikasi otomatis.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(item => {
              const status = getItemStatus(item)
              const isQueued = status === 'queued'
              const isParsing = status === 'parsing' || status === 'processing'
              const isReady = status === 'ready'
              const isError = status === 'error'
              const isPromoted = status === 'promoted' || !!item.promotedApplicantId || !!item.promoted_applicant_id
              const duplicateOf = item.duplicateOf ?? item.duplicate_of
              const isDuplicate = !!duplicateOf || status === 'duplicate'
              const score = item.score ?? (item as any).screening_score ?? (item as any).screeningScore
              const band = item.band ?? (item as any).screening_band ?? (item as any).screeningBand
              const verdictRaw = item.verdict ?? (item as any).screening_verdict ?? (item as any).screeningVerdict
              const verdict = deriveVerdict(band, verdictRaw)
              const rationale = item.rationale ?? (item as any).screening_summary ?? (item as any).rationale ?? ''
              const matched = parseChips((item.matched as any) ?? (item as any).screening_matched ?? (item as any).matched)
              const missing = parseChips((item.missing as any) ?? (item as any).screening_missing ?? (item as any).missing)
              const knockoutFailed = item.knockoutFailed ?? item.knockout_failed ?? (item as any).knockoutFailed ?? false
              const knockoutQ = item.knockoutFailedQuestion ?? item.knockout_question ?? (item as any).knockoutQuestion ?? (knockouts[0]?.question || 'Knockout tidak terpenuhi')
              const reasonText = (item.reason ?? item.error ?? (item as any).error_reason ?? '') as string
              const pState = promoteState[String(item.id)]

              return (
                <div key={String(item.id)} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  {/* Row top: filename + status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename || `Item #${item.id}`}
                      </div>
                      {item.name && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{item.name}{item.email ? ` · ${item.email}` : ''}</div>}
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(isQueued || isParsing) && (
                        <span data-ch-shimmer style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', animation: 'ch-shimmer 1.2s ease-in-out infinite' }}>
                          {isQueued ? 'Queued...' : 'Parsing...'}
                        </span>
                      )}
                      {isReady && verdict && (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', ...verdictStyle(verdict) }}>
                          {verdict}{score != null ? ` · ${score}%` : ''}
                        </span>
                      )}
                      {isReady && !verdict && score != null && band && (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', ...verdictStyle(deriveVerdict(band, undefined)) }}>
                          {deriveVerdict(band, undefined)}{` · ${score}% · ${band}`}
                        </span>
                      )}
                      {isError && (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                          Error
                        </span>
                      )}
                      {isDuplicate && !isPromoted && (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                          Duplikat
                        </span>
                      )}
                      {isPromoted && (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', color: '#0D9488', background: '#F0FDFA', border: '1px solid #99F6E4' }}>
                          Promoted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Duplicate banner */}
                  {isDuplicate && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>Sudah melamar</span>
                      <span style={{ fontSize: '12px', color: '#92400E', marginLeft: '6px' }}>
                        Kandidat dengan email/nama/file yang sama sudah ada di job ini.
                      </span>
                      {duplicateOf && <span style={{ fontSize: '12px', color: '#92400E' }}> · Lihat kandidat #{String(duplicateOf)}</span>}
                    </div>
                  )}

                  {/* Promoted note */}
                  {isPromoted && (
                    <div style={{ background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', color: '#0F766E' }}>
                      Sudah dipromosikan ke <strong>Applied</strong>
                      {(item.promotedApplicantId || item.promoted_applicant_id) && <span> · Kandidat #{String(item.promotedApplicantId || item.promoted_applicant_id)}</span>}
                    </div>
                  )}

                  {/* Error reason */}
                  {isError && reasonText && (
                    <div style={{ fontSize: '12px', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
                      {String(reasonText)}
                    </div>
                  )}

                  {/* Ready details */}
                  {isReady && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {rationale && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#334155', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #F1F5F9', lineHeight: 1.5 }}>
                          {String(rationale)}
                        </p>
                      )}
                      {(matched.length > 0 || missing.length > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          {matched.map((m, i) => (
                            <span key={`m-${i}`} style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>{m}</span>
                          ))}
                          {missing.map((m, i) => (
                            <span key={`miss-${i}`} style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'white', color: '#DC2626', border: '1px solid #FECACA' }}>{m}</span>
                          ))}
                        </div>
                      )}
                      {knockoutFailed && (
                        <div style={{ fontSize: '11px', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                          Knockout gagal: {String(knockoutQ)}
                        </div>
                      )}
                      {score != null && band && verdict && (
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Skor {String(score)}% · {String(band)} · Verdict <strong style={{ color: '#0F172A' }}>{verdict}</strong> <span style={{ color: '#94A3B8' }}>(Demo)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Queued/parsing placeholder */}
                  {(isQueued || isParsing) && (
                    <div data-ch-shimmer style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', animation: 'ch-shimmer 1.2s ease-in-out infinite' }}>
                      <div style={{ height: '8px', borderRadius: '6px', background: '#E2E8F0', width: '70%' }} />
                      <div style={{ height: '8px', borderRadius: '6px', background: '#F1F5F9', width: '100%' }} />
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {isReady && !isPromoted && !isDuplicate && !pState?.show && (
                      <button
                        type="button"
                        aria-label={`Promote ${item.filename}`}
                        onClick={() => startPromote(item)}
                        style={{ background: '#0D9488', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Promote ke Applied
                      </button>
                    )}
                    {pState?.show && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#F8FAFC', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', flex: 1 }}>
                        <input
                          type="text"
                          aria-label="Nama kandidat"
                          placeholder="Nama"
                          value={pState.name}
                          onChange={e => setPromoteState(prev => ({ ...prev, [String(item.id)]: { ...prev[String(item.id)], name: e.target.value } }))}
                          style={{ flex: '1 1 140px', padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', minWidth: '120px' }}
                        />
                        <input
                          type="email"
                          aria-label="Email kandidat"
                          placeholder="Email"
                          value={pState.email}
                          onChange={e => setPromoteState(prev => ({ ...prev, [String(item.id)]: { ...prev[String(item.id)], email: e.target.value } }))}
                          style={{ flex: '1 1 160px', padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', minWidth: '140px' }}
                        />
                        <button
                          type="button"
                          aria-label="Konfirmasi promote"
                          disabled={pState.saving}
                          onClick={() => handlePromoteConfirm(item)}
                          style={{ background: '#0D9488', color: 'white', border: 'none', padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: pState.saving ? 'wait' : 'pointer', opacity: pState.saving ? 0.6 : 1 }}
                        >
                          {pState.saving ? 'Memproses...' : 'Konfirmasi'}
                        </button>
                        <button
                          type="button"
                          aria-label="Batal promote"
                          onClick={() => setPromoteState(prev => { const n = { ...prev }; delete n[String(item.id)]; return n })}
                          style={{ background: 'white', color: '#475569', border: '1px solid #CBD5E1', padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Batal
                        </button>
                      </div>
                    )}
                    {/* Dismiss always available unless already promoted? spec says dismiss hides item without record */}
                    <button
                      type="button"
                      aria-label={`Dismiss ${item.filename}`}
                      onClick={() => handleDismiss(item)}
                      style={{ background: 'white', color: '#64748B', border: '1px solid #E2E8F0', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: pState?.show ? '0' : 'auto' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pre-flight Credit Confirmation Modal */}
      {showPreflightModal && preflightData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                ⚡
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Konfirmasi Batch AI Screening</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>Pemotongan kredit untuk {pendingFiles.length} berkas CV</p>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Jumlah CV diunggah:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{pendingFiles.length} berkas</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Kredit dibutuhkan:</span>
                <span style={{ fontWeight: 700, color: '#D97706' }}>{preflightData.required} Kredit</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Saldo kredit saat ini:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{preflightData.current} Kredit</span>
              </div>
              <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Sisa saldo setelah proses:</span>
                <span style={{ fontWeight: 700, color: preflightData.allowed ? '#16A34A' : '#DC2626' }}>
                  {preflightData.allowed ? `${preflightData.current - preflightData.required} Kredit` : 'Kredit Tidak Cukup'}
                </span>
              </div>
            </div>

            {!preflightData.allowed && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
                ⚠️ Saldo kredit Anda kurang {preflightData.shortage} kredit untuk memproses batch ini. Silakan Top Up terlebih dahulu.
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowPreflightModal(false); setPendingFiles([]); }}
                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Batal
              </button>
              {preflightData.allowed ? (
                <button
                  type="button"
                  onClick={() => executeBatchUpload(pendingFiles)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#0D9488', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Lanjutkan & Proses AI
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowPreflightModal(false);
                    setPendingFiles([]);
                    window.dispatchEvent(new CustomEvent('openTopupModal'));
                  }}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#D97706', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  + Top Up Saldo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
