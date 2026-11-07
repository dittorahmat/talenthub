import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  TalentHubClient,
  ApplicantDetail,
  NoteItem,
  ActivityItem,
  isInsufficientCredit,
} from '../services/apiClient'
import { Candidate } from './CandidateCard'
import { FileIcon, NoteIcon, ClockIcon, WhatsAppIcon } from './Icons'
import { Candidate1PageSummaryModal } from './Candidate1PageSummaryModal'
import { formatWhatsAppSummary, generateInterviewQuestions } from '../utils/summaryExport'
import { buildWhatsAppUrl, buildEmailMailtoUrl } from '../utils/outreach'

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
  const [details, setDetails] = useState<ApplicantDetail | null>(null)
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [uploadError, setUploadError] = useState<{ message: string; isCreditError?: boolean } | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const loadData = useCallback(() => {
    TalentHubClient.applicants.get(candidate.id)
      .then(data => {
        setDetails(data)
        setNotes(data.notes || [])
        setActivities(data.activities || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [candidate.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Poll every 1.5s while processing, max 10 attempts, stop when ready or unmounted
  useEffect(() => {
    const status: string | undefined = details?.screening_status
    if (status !== 'processing') return
    let count = 0
    let cancelled = false
    const interval = setInterval(() => {
      count += 1
      if (count > 10) {
        clearInterval(interval)
        return
      }
      TalentHubClient.applicants.get(candidate.id)
        .then(data => {
          if (cancelled) return
          setDetails(data)
          if (data.notes) setNotes(data.notes)
          if (data.activities) setActivities(data.activities)
          const nextStatus = data?.screening_status
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
  }, [details?.screening_status, candidate.id])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    try {
      await TalentHubClient.applicants.addNote(candidate.id, newNote, 'HR Admin')
      setNewNote('')
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleNextStage = () => {
    const currentIndex = stages.indexOf(candidate.status)
    if (currentIndex < stages.length - 1) {
      const next = stages[currentIndex + 1]
      onStatusChange(candidate.id, next)
    }
  }

  const handleWhatsApp = () => {
    const url = buildWhatsAppUrl({
      phone: candidate.phone,
      candidateName: candidate.name,
      jobTitle: details?.job?.title,
    })
    window.open(url, '_blank')
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploadingResume(true)
    try {
      await TalentHubClient.applicants.uploadResume(candidate.id, file)
      loadData()
    } catch (err: unknown) {
      if (isInsufficientCredit(err)) {
        setUploadError({
          message: err.message || 'Saldo kredit tidak mencukupi untuk melakukan AI screening. Silakan Top Up terlebih dahulu.',
          isCreditError: true
        })
      } else {
        const msg = err instanceof Error ? err.message : 'Gagal memproses resume'
        setUploadError({ message: msg })
      }
    } finally {
      setUploadingResume(false)
      e.target.value = ''
    }
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
  const isErrorStatus = screeningStatus === 'error' || screeningVerdictRaw?.toLowerCase() === 'error'
  const isReadyStatus = !isErrorStatus && screeningStatus === 'ready' && screeningScore != null

  const handleCopyWhatsAppSummary = async () => {
    const text = formatWhatsAppSummary({
      candidateName: candidate.name,
      appliedRole: details?.job?.title || 'Posisi Terkait',
      appliedDate: candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini',
      score: screeningScore,
      verdict: screeningVerdict,
      summary: screeningSummary,
      matchedSkills: matchedChips,
      missingSkills: missingChips,
      expYears: screeningExpYears,
      interviewQuestions: details?.interview_questions || generateInterviewQuestions(missingChips, details?.job?.title || 'posisi ini')
    })

    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2500)
    }
  }

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

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                aria-label="Bagikan Ringkasan ke Hiring Manager"
                onClick={() => setShowSummaryModal(true)}
                style={{
                  background: '#0D9488',
                  color: 'white',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <span>📄</span> Bagikan Ringkasan ke Hiring Manager
              </button>
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
              <a
                href={buildEmailMailtoUrl({
                  email: candidate.email,
                  candidateName: candidate.name,
                  jobTitle: details?.job?.title,
                })}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Kirim Email
              </a>
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

            {/* Resume Upload / Replace Action */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{
                cursor: uploadingResume ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                opacity: uploadingResume ? 0.6 : 1
              }}>
                <span>{uploadingResume ? 'Mengunggah & Evaluasi AI...' : 'Unggah / Ganti Resume CV (1 Kredit)'}</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  disabled={uploadingResume}
                  onChange={handleResumeUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Biaya evaluasi AI: 1 kredit per CV</span>
            </div>

            {/* Corrupted File / Screening Error Banner */}
            {isErrorStatus && (
              <div style={{
                marginTop: '12px',
                padding: '12px 14px',
                background: '#FFFBEB',
                border: '1px solid #FCD34D',
                borderRadius: '8px',
                color: '#92400E',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}></span>
                <div>
                  <strong>File tidak dapat dibaca / rusak.</strong> 1 Kredit telah dikembalikan ke dompet Anda. Silakan unggah ulang format PDF/DOCX yang valid.
                </div>
              </div>
            )}

            {uploadError && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div>
                  <strong>{uploadError.isCreditError ? 'Saldo Kredit Habis' : 'Gagal Mengunggah'}:</strong> {uploadError.message}
                </div>
                {uploadError.isCreditError && (
                  <button
                    type="button"
                    onClick={() => {
                      // Navigate to billing / top-up or prompt
                      window.location.hash = '#/billing'
                      onClose()
                    }}
                    style={{
                      background: '#DC2626',
                      color: 'white',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Top Up Kredit
                  </button>
                )}
              </div>
            )}
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
              {isErrorStatus && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                  Error / Rusak
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
            ) : isErrorStatus ? (
              <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', color: '#991B1B' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                  Gagal Memproses Berkas CV
                </div>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5 }}>
                  {screeningSummary || 'File CV rusak atau tidak terbaca. 1 Kredit telah dikembalikan ke saldo dompet.'}
                </p>
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

                {/* Export & Share Shortcut in Screening Card */}
                <div style={{
                  marginTop: '6px',
                  paddingTop: '12px',
                  borderTop: '1px dashed #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                    Bagikan ringkasan evaluasi AI ke Hiring Manager:
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppSummary}
                      style={{
                        background: copySuccess ? '#15803D' : '#F0FDF4',
                        color: copySuccess ? 'white' : '#16A34A',
                        border: '1px solid #BBF7D0',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <WhatsAppIcon size={13} color={copySuccess ? 'white' : '#16A34A'} />
                      <span>{copySuccess ? 'Tersalin!' : 'Salin untuk WhatsApp'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSummaryModal(true)}
                      style={{
                        background: 'white',
                        color: '#0D9488',
                        border: '1px solid #0D9488',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileIcon size={13} color="#0D9488" />
                      <span>1-Page PDF / Print</span>
                    </button>
                  </div>
                </div>
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

      {showSummaryModal && (
        <Candidate1PageSummaryModal
          candidate={{
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            status: candidate.status,
            created_at: candidate.created_at
          }}
          jobTitle={details?.job?.title || 'Posisi yang Dilamar'}
          screening={{
            score: screeningScore,
            band: screeningBand,
            verdict: screeningVerdict,
            summary: screeningSummary,
            matchedSkills: matchedChips,
            missingSkills: missingChips,
            expYears: screeningExpYears,
            interviewQuestions: details?.interview_questions
          }}
          onClose={() => setShowSummaryModal(false)}
        />
      )}
    </div>
  )
}
