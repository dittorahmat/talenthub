import React, { useState } from 'react'
import { WhatsAppIcon, FileIcon } from './Icons'
import { formatWhatsAppSummary, generateInterviewQuestions } from '../utils/summaryExport'

export interface Candidate1PageSummaryModalProps {
  candidate: {
    id: number
    name: string
    email: string
    phone?: string
    status: string
    created_at?: string
  }
  jobTitle?: string
  screening: {
    score?: number | null
    band?: string | null
    verdict?: string | null
    summary?: string | null
    matchedSkills?: string[]
    missingSkills?: string[]
    expYears?: number | null
    interviewQuestions?: string[]
  }
  onClose: () => void
}

export const Candidate1PageSummaryModal: React.FC<Candidate1PageSummaryModalProps> = ({
  candidate,
  jobTitle = 'Posisi yang Dilamar',
  screening,
  onClose
}) => {
  const [copied, setCopied] = useState(false)

  const formattedDate = candidate.created_at
    ? new Date(candidate.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'Hari ini'

  const matched = screening.matchedSkills || []
  const missing = screening.missingSkills || []
  const questions =
    screening.interviewQuestions && screening.interviewQuestions.length > 0
      ? screening.interviewQuestions
      : generateInterviewQuestions(missing, jobTitle)

  const verdict = screening.verdict || (screening.band === 'Strong' ? 'Hire' : screening.band === 'Potential' ? 'Consider' : screening.band ? 'Pass' : null)
  const score = screening.score

  const getVerdictStyle = (v?: string | null): React.CSSProperties => {
    const val = (v || '').toLowerCase()
    if (val === 'hire') return { color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0' }
    if (val === 'consider') return { color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A' }
    if (val === 'pass') return { color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }
    return { color: '#64748B', background: '#F1F5F9', border: '1px solid #CBD5E1' }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopyWhatsApp = async () => {
    const text = formatWhatsAppSummary({
      candidateName: candidate.name,
      appliedRole: jobTitle,
      appliedDate: formattedDate,
      score: score,
      verdict: verdict,
      summary: screening.summary,
      matchedSkills: matched,
      missingSkills: missing,
      expYears: screening.expYears,
      interviewQuestions: questions
    })

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Ringkasan 1-Halaman AI untuk ${candidate.name}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px'
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #candidate-1page-print-card, #candidate-1page-print-card * {
            visibility: visible;
          }
          #candidate-1page-print-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#F8FAFC',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '94vh',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: '14px 20px',
            background: 'white',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📄</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                1-Page Candidate Intelligence Summary
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Format standar hiring manager untuk review cepat & wawancara
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              style={{
                background: copied ? '#15803D' : '#F0FDF4',
                color: copied ? 'white' : '#16A34A',
                border: '1px solid #BBF7D0',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <WhatsAppIcon size={15} color={copied ? 'white' : '#16A34A'} />
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin untuk WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#0D9488',
                color: 'white',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <FileIcon size={15} color="white" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              type="button"
              aria-label="Tutup ringkasan"
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#64748B',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable 1-Page Summary Card */}
        <div style={{ overflowY: 'auto', padding: '24px' }}>
          <div
            id="candidate-1page-print-card"
            style={{
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#1E293B'
            }}
          >
            {/* Document Header & Branding */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid #0D9488',
                paddingBottom: '16px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0D9488', letterSpacing: '-0.02em' }}>
                    TalentHub
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 700,
                      background: '#CCFBF1',
                      color: '#0F766E',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    Talent Intelligence
                  </span>
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
                  {candidate.name}
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>
                  {jobTitle} · Melamar pada {formattedDate}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Kontak: {candidate.email} {candidate.phone ? `· ${candidate.phone}` : ''}
                </p>
              </div>

              {/* AI Fit Score & Verdict Card */}
              <div
                style={{
                  textAlign: 'right',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  minWidth: '160px'
                }}
              >
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                  Skor Kecocokan AI
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {score != null ? `${score}%` : 'N/A'}
                </div>
                {verdict && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      ...getVerdictStyle(verdict)
                    }}
                  >
                    Rekomendasi: {verdict}
                  </span>
                )}
              </div>
            </div>

            {/* Executive AI Summary */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>💡</span>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Executive AI Summary
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>
                {screening.summary || 'Belum ada ringkasan evaluasi. Unggah berkas resume untuk memicu analisis kualifikasi.'}
              </p>
              {screening.expYears != null && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#0F766E', fontWeight: 600 }}>
                  Pengalaman Relevan Terdeteksi: {screening.expYears} Tahun
                </div>
              )}
            </div>

            {/* Skills Breakdown Grid: Matched vs Gaps */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Matched Core Skills */}
              <div style={{ border: '1px solid #BBF7D0', background: '#F0FDF4', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Matched Core Skills ({matched.length})
                  </h4>
                </div>
                {matched.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {matched.map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'white',
                          color: '#15803D',
                          border: '1px solid #86EFAC'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                    Belum ada keahlian terverifikasi.
                  </p>
                )}
              </div>

              {/* Missing Skills / Gaps */}
              <div style={{ border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span style={{ color: '#DC2626', fontWeight: 800 }}>!</span>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Missing Skills / Gaps ({missing.length})
                  </h4>
                </div>
                {missing.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {missing.map((gap, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'white',
                          color: '#B91C1C',
                          border: '1px solid #FCA5A5'
                        }}
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: '#15803D', fontWeight: 500 }}>
                    Tidak ditemukan celah keahlian signifikan.
                  </p>
                )}
              </div>
            </div>

            {/* Formatted Interview Questions for Hiring Manager */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px' }}>🎯</span>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Panduan Pertanyaan Wawancara (Berdasarkan Celah Kualifikasi)
                </h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#334155',
                      lineHeight: 1.5,
                      background: '#F8FAFC',
                      padding: '8px 12px',
                      borderRadius: '6px'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#0D9488', minWidth: '18px' }}>{idx + 1}.</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer stamp */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '12px',
                borderTop: '1px dashed #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#94A3B8'
              }}
            >
              <span>Dokumen Rahasia Internal TalentHub · Talent Intelligence SaaS</span>
              <span>Dicetak / Diekspor pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
