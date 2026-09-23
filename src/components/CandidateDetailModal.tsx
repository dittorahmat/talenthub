import React, { useState, useEffect } from 'react'
import { Candidate } from './CandidateCard'
import { FileIcon, NoteIcon, ClockIcon, WhatsAppIcon } from './Icons'

interface Note {
  id: number
  applicantId: number
  text: string
  author: string
  created_at: string
}

interface Activity {
  id: number
  applicantId: number
  type: string
  description: string
  user: string
  timestamp: string
}

interface CandidateDetailModalProps {
  candidate: Candidate
  stages: string[]
  onClose: () => void
  onStatusChange: (id: number, newStatus: string) => void
  onDelete: (candidate: Candidate) => void
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Hari ini'
  if (diffDays === 1) return '1 hari lalu'
  if (diffDays < 7) return `${diffDays} hari lalu`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`
  return `${Math.floor(diffDays / 30)} bulan lalu`
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  candidate,
  stages,
  onClose,
  onStatusChange,
  onDelete
}) => {
  const [details, setDetails] = useState<any>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    fetch(`/api/applicants/${candidate.id}`)
      .then(res => res.json())
      .then(data => {
        setDetails(data)
        setNotes(data.notes || [])
        setActivities(data.activities || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [candidate.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Poll every 1.5s while processing, max 10 attempts, stop when ready or unmounted
  useEffect(() => {
    const status: string | undefined = details?.screening_status ?? details?.screeningStatus
    if (status !== 'processing') return
    let count = 0
    let cancelled = false
    const interval = setInterval(() => {
      count += 1
      if (count > 10) {
        clearInterval(interval)
        return
      }
      fetch(`/api/applicants/${candidate.id}`)
        .then(res => res.json())
        .then(data => {
          if (cancelled) return
          setDetails((prev: any) => ({ ...prev, ...data }))
          if (data.notes) setNotes(data.notes)
          if (data.activities) setActivities(data.activities)
          const nextStatus: string | undefined = data?.screening_status ?? data?.screeningStatus
          if (nextStatus === 'ready' || nextStatus === 'pending' || nextStatus == null) {
            clearInterval(interval)
          }
        })
        .catch(() => {})
      if (count >= 10) clearInterval(interval)
    }, 1500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [details?.screening_status, details?.screeningStatus, candidate.id])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    await fetch(`/api/applicants/${candidate.id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newNote, author: 'HR Admin' })
    })

    setNewNote('')
    loadData()
  }

  const handleNextStage = () => {
    const currentIndex = stages.indexOf(candidate.status)
    if (currentIndex < stages.length - 1) {
      const next = stages[currentIndex + 1]
      onStatusChange(candidate.id, next)
    }
  }

  const handleWhatsApp = () => {
    const cleanPhone = (candidate.phone || '').replace(/[\s\-+]/g, '')
    const msg = `Halo ${candidate.name}, ini pengingat interview Anda di TalentHub. Silakan konfirmasi kehadirannya.`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const screeningStatus: string | undefined = details?.screening_status ?? details?.screeningStatus
  const screeningSummary: string | undefined = details?.screening_summary ?? details?.screeningSummary ?? details?.summary
  const screeningScore: number | undefined = details?.screening_score ?? details?.screeningScore ?? details?.score
  const screeningBand: string | undefined = details?.screening_band ?? details?.screeningBand ?? details?.band
  const rawMatched: string | string[] | undefined = details?.screening_matched ?? details?.screeningMatched ?? details?.matched
  const rawMissing: string | string[] | undefined = details?.screening_missing ?? details?.screeningMissing ?? details?.missing
  const screeningExpYears: number | undefined = details?.screening_exp_years ?? details?.screeningExpYears ?? details?.exp_years ?? details?.expYears

  const parseChips = (val: string | string[] | undefined): string[] => {
    if (!val) return []
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean)
    return String(val).split(',').map(s => s.trim()).filter(Boolean)
  }
  const matchedChips = parseChips(rawMatched)
  const missingChips = parseChips(rawMissing)

  const getBandPillStyle = (band?: string): React.CSSProperties => {
    const b = (band || '').toLowerCase()
    if (b === 'strong') return { color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0' }
    if (b === 'potential') return { color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A' }
    return { color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0' }
  }

  function getVerdictStyle(verdict?: string | null): React.CSSProperties {
    const v = (verdict || '').toLowerCase()
    if (v === 'hire') return { color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0' }
    if (v === 'consider') return { color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A' }
    return { color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0' }
  }
  function deriveVerdictLocal(band?: string, verdict?: string): string | null {
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
  const screeningVerdictRaw: string | undefined = (details as any)?.screening_verdict ?? (details as any)?.screeningVerdict ?? (details as any)?.verdict ?? (candidate as any)?.screening_verdict ?? (candidate as any)?.verdict
  const screeningVerdict = deriveVerdictLocal(screeningBand, screeningVerdictRaw)

  const isProcessingStatus = screeningStatus === 'processing'
  const isReadyStatus = screeningStatus === 'ready' && screeningScore != null

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail ${candidate.name}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#0D9488',
              color: 'white',
              fontSize: '18px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {candidate.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {candidate.name}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                {candidate.email} · {candidate.phone || 'No phone'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup modal"
            onClick={onClose}
            style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#64748B', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Bar */}
          <div style={{
            background: '#F8FAFC',
            padding: '16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tahap Saat Ini:</span>
              <select
                value={candidate.status}
                onChange={(e) => onStatusChange(candidate.id, e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0D9488'
                }}
              >
                {stages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                aria-label="Kirim WhatsApp"
                onClick={handleWhatsApp}
                style={{
                  background: '#15803D',
                  color: 'white',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <WhatsAppIcon size={14} color="white" /> WhatsApp
              </button>
              {stages.indexOf(candidate.status) < stages.length - 1 && (
                <button
                  type="button"
                  aria-label="Pindah ke tahap berikutnya"
                  onClick={handleNextStage}
                  style={{
                    background: '#0D9488',
                    color: 'white',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Pindah Tahap Berikutnya
                </button>
              )}
              <button
                type="button"
                aria-label={`Hapus ${candidate.name}`}
                onClick={() => onDelete(candidate)}
                style={{
                  background: 'white',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hapus Kandidat
              </button>
            </div>
          </div>

          {/* Candidate Profile Details & Resume Section */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <FileIcon size={16} color="#0D9488" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                Berkas Resume & Profil
              </h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '16px' }}>
              <div><span style={{ color: '#64748B' }}>Sumber Pelamar:</span> <strong>{candidate.source || 'JobStreet'}</strong></div>
              <div><span style={{ color: '#64748B' }}>Tanggal Melamar:</span> <strong>{timeAgo(candidate.created_at)}</strong></div>
            </div>

            {/* Resume File */}
            <div style={{
              background: '#F1F5F9',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileIcon size={20} color="#0D9488" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                    {details?.resume_filename || candidate.resume_filename || 'Resume-CV.pdf'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    PDF Dokumen · Terverifikasi
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={details?.resume_url || '/test-resume.pdf'}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: 'none',
                    background: 'white',
                    border: '1px solid #CBD5E1',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155'
                  }}
                >
                  View PDF
                </a>
                <a
                  href={details?.resume_url || '/test-resume.pdf'}
                  download
                  style={{
                    textDecoration: 'none',
                    background: '#0D9488',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  Download
                </a>
              </div>
            </div>
          </div>

          {/* Skrining Kualifikasi Section — shimmer only when screening_status === processing, stops on ready (R-19) */}
          <style>{`@keyframes cdm-shimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } } @media (prefers-reduced-motion: reduce) { [data-cdm-shimmer] { animation: none !important; } }`}</style>
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isProcessingStatus ? '#F59E0B' : isReadyStatus ? '#0D9488' : '#CBD5E1', display: 'inline-block', flexShrink: 0 }} />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Skrining Kualifikasi</h4>
              {isReadyStatus && screeningBand && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', ...getBandPillStyle(screeningBand) }}>
                  {screeningBand}
                </span>
              )}
              {isReadyStatus && screeningVerdict && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', ...getVerdictStyle(screeningVerdict) }}>
                  {screeningVerdict}
                </span>
              )}
            </div>

            {isProcessingStatus ? (
              <div data-cdm-shimmer style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'cdm-shimmer 1.2s ease-in-out infinite' }}>
                <div style={{ height: '10px', borderRadius: '6px', background: '#E2E8F0', width: '70%' }} />
                <div style={{ height: '10px', borderRadius: '6px', background: '#F1F5F9', width: '100%' }} />
                <div style={{ height: '10px', borderRadius: '6px', background: '#F1F5F9', width: '85%' }} />
                <div style={{ height: '8px', borderRadius: '6px', background: '#E2E8F0', width: '45%' }} />
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <div style={{ height: '22px', borderRadius: '12px', background: '#E2E8F0', width: '72px' }} />
                  <div style={{ height: '22px', borderRadius: '12px', background: '#F1F5F9', width: '72px' }} />
                  <div style={{ height: '22px', borderRadius: '12px', background: '#F1F5F9', width: '72px' }} />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>Sistem sedang memproses data CV... mohon tunggu sebentar</p>
              </div>
            ) : isReadyStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Kecocokan</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{screeningScore}%</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '999px', background: '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, Number(screeningScore)))}%`, background: (screeningBand || '').toLowerCase() === 'strong' ? '#16A34A' : (screeningBand || '').toLowerCase() === 'potential' ? '#D97706' : '#64748B', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {screeningSummary && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    {screeningSummary}
                  </p>
                )}

                {matchedChips.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Keahlian Cocok</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {matchedChips.map((chip, i) => (
                        <span key={`m-${i}`} style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>{chip}</span>
                      ))}
                    </div>
                  </div>
                )}

                {missingChips.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Keahlian Belum Ada</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {missingChips.map((chip, i) => (
                        <span key={`miss-${i}`} style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', background: 'white', color: '#DC2626', border: '1px solid #FECACA' }}>{chip}</span>
                      ))}
                    </div>
                  </div>
                )}

                {screeningExpYears != null && (
                  <div style={{ fontSize: '13px', color: '#334155', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    Pengalaman: <strong>{screeningExpYears} tahun</strong>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '18px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Upload CV untuk memulai analisis kualifikasi</p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94A3B8' }}>Ringkasan, skor kecocokan, dan analisis keahlian akan muncul di sini setelah CV diunggah.</p>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <NoteIcon size={16} color="#0D9488" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                Catatan HR & Pewawancara
              </h4>
            </div>
            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Tambahkan catatan evaluasi kandidat..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#0D9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Catat
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loading ? (
                <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '12px' }}>Memuat catatan...</p>
              ) : notes.length === 0 ? (
                <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #E2E8F0' }}>Belum ada catatan — tambahkan evaluasi pertama pada form di atas.</p>
              ) : (
                notes.map(note => (
                <div key={note.id} style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{note.author}</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{timeAgo(note.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>{note.text}</p>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Timeline Section */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ClockIcon size={16} color="#0D9488" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                Activity Timeline
              </h4>
            </div>
            <div style={{ position: 'relative', paddingLeft: '20px' }}>
              <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: '#E2E8F0' }} />
              {loading ? (
                <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', padding: '8px 0' }}>Memuat aktivitas...</p>
              ) : activities.length === 0 ? (
                <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', padding: '8px 0' }}>Belum ada aktivitas — perubahan status dan catatan akan tercatat di sini.</p>
              ) : (
                activities.map((act) => (
                <div key={act.id} style={{ position: 'relative', marginBottom: '16px' }}>
                  <div style={{
                    position: 'absolute',
                    left: '-17px',
                    top: '2px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: act.type === 'status_change' ? '#0D9488' : act.type === 'note' ? '#10B981' : '#F59E0B'
                  }} />
                  <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>
                    {act.description}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    {act.user} · {timeAgo(act.timestamp)}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
