import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  TalentHubClient,
  InboxItem,
  BatchPreflightResponse,
  isInsufficientCredit,
} from '../services/apiClient'
import { useScreeningProgress } from '../hooks/useScreeningProgress'
import { sortByScoreDesc } from '../utils/scoreRanking'
import { validateResumeFile } from '../utils/outreach'

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
  const [cancelling, setCancelling] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // promote inline edit state
  const [promoteState, setPromoteState] = useState<Record<string, { name: string; email: string; show: boolean; saving?: boolean }>>({})

  // pre-flight confirmation modal state
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [preflightData, setPreflightData] = useState<BatchPreflightResponse | null>(null)
  const [showPreflightModal, setShowPreflightModal] = useState(false)

  const fetchInbox = useCallback(async () => {
    try {
      const res = await TalentHubClient.inbox.list(jobId)
      const rawItems: InboxItem[] = Array.isArray(res) ? res : res.items || []
      const sorted = sortByScoreDesc(rawItems)
      setItems(sorted)
      const rawKOs = (res as any).knockouts || (res as any).knockoutQuestions || []
      if (Array.isArray(rawKOs)) setKnockouts(rawKOs)
      setError(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat inbox'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  // Hook-based screening progress tracking
  const { progress, isProcessing, cancel: cancelProgressBatch } = useScreeningProgress(jobId, {
    enabled: true,
    intervalMs: 1500,
    onComplete: () => {
      fetchInbox()
      window.dispatchEvent(new Event('walletChanged'))
    },
  })

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const handleFiles = async (files: FileList | File[]) => {
    const rawArr = Array.from(files)
    if (rawArr.length === 0) return
    setUploadError(null)

    // Validate files using shared helper
    for (const f of rawArr) {
      const v = validateResumeFile(f)
      if (!v.valid) {
        setUploadError(v.error || 'Berkas tidak valid')
        return
      }
    }

    const arr = rawArr

    // Pre-flight check via client before accepting
    try {
      const pf = await TalentHubClient.inbox.preflight(jobId, arr.length)
      setPendingFiles(arr)
      setPreflightData(pf)
      setShowPreflightModal(true)
      return
    } catch {
      // Fallback direct execution if preflight check fails or unavailable
      executeBatchUpload(arr)
    }
  }

  const executeBatchUpload = async (arr: File[]) => {
    setShowPreflightModal(false)
    setUploading(true)
    try {
      await TalentHubClient.inbox.uploadBatch(jobId, arr)
      window.dispatchEvent(new Event('walletChanged'))
      await fetchInbox()
    } catch (e: unknown) {
      if (isInsufficientCredit(e)) {
        setUploadError(e.message)
      } else {
        const msg = e instanceof Error ? e.message : 'Upload gagal'
        setUploadError(msg)
      }
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
      await TalentHubClient.inbox.dismiss(Number(item.id))
      await fetchInbox()
    } catch (e) {
      console.error(e)
      await fetchInbox()
    }
  }

  const handleCancelBatch = async () => {
    if (!window.confirm('Batalkan seluruh antrean screening yang belum diproses dan kembalikan kredit?')) return
    setCancelling(true)
    try {
      await cancelProgressBatch()
      await fetchInbox()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membatalkan batch'
      setUploadError(msg)
    } finally {
      setCancelling(false)
    }
  }

  const handlePromoteConfirm = async (item: InboxItem) => {
    const st = promoteState[String(item.id)]
    if (!st) return
    setPromoteState(prev => ({ ...prev, [String(item.id)]: { ...st, saving: true } }))
    try {
      await TalentHubClient.inbox.promote(Number(item.id), {
        name: st.name.trim(),
        email: st.email.trim(),
      })
      setPromoteState(prev => {
        const n = { ...prev }
        delete n[String(item.id)]
        return n
      })
      await fetchInbox()
      onPromoted()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal promote'
      setUploadError(msg)
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                Screening Inbox — {jobTitle}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                Drop berkas CV di bawah untuk screening otomatis dan evaluasi kualifikasi kandidat.
              </p>
            </div>
          </div>

          {/* Batch Progress & Cancel Action */}
          {isProcessing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: '1px solid #E2E8F0', padding: '8px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <span style={{ fontWeight: 700, color: '#0D9488' }}>Memproses:</span> {progress?.completed ?? 0} dari {progress?.total ?? 0} ({progress?.percentage ?? 0}%)
              </div>
              <button
                type="button"
                aria-label="Batalkan antrean batch"
                disabled={cancelling}
                onClick={handleCancelBatch}
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#DC2626',
                  cursor: cancelling ? 'wait' : 'pointer',
                  opacity: cancelling ? 0.6 : 1,
                }}
              >
                {cancelling ? 'Membatalkan...' : 'Batal Antrean'}
              </button>
            </div>
          )}
        </div>

        {/* Knockouts info */}
        {knockouts.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Kriteria Knockout</div>
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
            {uploading ? 'Mengunggah...' : 'Drop CV di sini atau klik untuk pilih file'}
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
              const score = item.score
              const band = item.band
              const verdictRaw = item.verdict
              const verdict = deriveVerdict(band, verdictRaw)
              const rationale = item.rationale || item.summary || ''
              const matched = parseChips(item.matched)
              const missing = parseChips(item.missing)
              const knockoutFailed = item.knockoutFailed ?? item.knockout_failed ?? false
              const knockoutQ = item.knockoutFailedQuestion ?? item.knockout_question ?? (knockouts[0]?.question || 'Knockout tidak terpenuhi')
              const reasonText = (item.reason ?? item.error ?? '') as string
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
                          Skor {String(score)}% · {String(band)} · Verdict <strong style={{ color: '#0F172A' }}>{verdict}</strong>
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
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Konfirmasi Pemrosesan Batch
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              Anda akan mengunggah <strong>{pendingFiles.length} berkas CV</strong> untuk job <strong>{jobTitle}</strong>.
            </p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Kredit Dibutuhkan:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{preflightData.required} Kredit</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Saldo Dompet Saat Ini:</span>
                <span style={{ fontWeight: 700, color: preflightData.allowed ? '#0D9488' : '#DC2626' }}>{preflightData.current} Kredit</span>
              </div>
              {!preflightData.allowed && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '8px', fontSize: '13px', color: '#DC2626', fontWeight: 700 }}>
                  <span>Kekurangan:</span>
                  <span>{preflightData.shortage} Kredit</span>
                </div>
              )}
            </div>

            {!preflightData.allowed && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#991B1B' }}>
                Saldo kredit tidak mencukupi untuk memproses seluruh berkas. Silakan lakukan Top Up kredit atau kurangi jumlah file yang diunggah.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowPreflightModal(false); setPendingFiles([]) }}
                style={{
                  background: 'white',
                  border: '1px solid #CBD5E1',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              {preflightData.allowed ? (
                <button
                  type="button"
                  onClick={() => executeBatchUpload(pendingFiles)}
                  style={{
                    background: '#0D9488',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Lanjutkan Screening ({preflightData.required} Kredit)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowPreflightModal(false)
                    window.dispatchEvent(new Event('openTopupModal'))
                  }}
                  style={{
                    background: '#2563EB',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Top Up Saldo Kredit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
