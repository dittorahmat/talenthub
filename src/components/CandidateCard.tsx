import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { EyeIcon, EditIcon, WhatsAppIcon, TrashIcon } from './Icons'
import { buildWhatsAppUrl, buildEmailMailtoUrl } from '../utils/outreach'

export interface Candidate {
  id: number
  job_id: number
  name: string
  email: string
  phone?: string
  source?: string
  status: string
  resume_filename?: string
  resume_keywords?: string
  created_at: string
  screening_status?: string
  screening_summary?: string
  screening_score?: number
  screening_band?: string
  screening_matched?: string | string[]
  screening_missing?: string | string[]
  screening_exp_years?: number
}

interface CandidateCardProps {
  candidate: Candidate
  jobTitle?: string
  stages: string[]
  onSelect: (candidate: Candidate) => void
  onStatusChange: (id: number, newStatus: string) => void
  onDelete: (candidate: Candidate) => void
  onScreenCandidate?: (candidate: Candidate) => void
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

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  jobTitle,
  stages,
  onSelect,
  onStatusChange,
  onDelete,
  onScreenCandidate,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  React.useEffect(() => {
    if (!showStatusDropdown) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowStatusDropdown(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showStatusDropdown])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: candidate.id.toString() })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: 'white',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    padding: '14px',
    boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
    cursor: 'grab',
    position: 'relative',
    userSelect: 'none'
  }

  const getBandStyle = (band?: string): React.CSSProperties | null => {
    if (!band) return null
    const b = band.toLowerCase()
    if (b === 'strong') return { color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0' }
    if (b === 'potential') return { color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A' }
    return { color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0' }
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

  const rawStatus: string | undefined = (candidate as any).screening_status ?? (candidate as any).screeningStatus
  const rawBand: string | undefined = (candidate as any).screening_band ?? (candidate as any).screeningBand
  const rawScore: number | undefined = (candidate as any).screening_score ?? (candidate as any).screeningScore
  const rawVerdict: string | undefined = (candidate as any).screening_verdict ?? (candidate as any).screeningVerdict ?? (candidate as any).verdict
  const derivedVerdict = deriveVerdict(rawBand, rawVerdict)
  const bandStyle = getBandStyle(rawBand)
  const isProcessing = rawStatus === 'processing'
  const showBadge = rawStatus === 'ready' && rawScore != null && rawBand && bandStyle

  const initials = candidate.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = buildWhatsAppUrl({
      phone: candidate.phone,
      candidateName: candidate.name,
      jobTitle,
    })
    window.open(url, '_blank')
  }

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = buildEmailMailtoUrl({
      email: candidate.email,
      candidateName: candidate.name,
      jobTitle,
    })
    window.location.href = url
  }

  return (
      <>
        <style>{`@keyframes ch-shimmer { 0% { opacity: 0.55; } 50% { opacity: 1; } 100% { opacity: 0.55; } } @media (prefers-reduced-motion: reduce) { [data-ch-shimmer] { animation: none !important; } }`}</style>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setShowStatusDropdown(false)
        }}
        onClick={() => onSelect(candidate)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: '#0D9488',
          color: 'white',
          fontSize: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {candidate.name}
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>
            {candidate.source || 'Website'} · {timeAgo(candidate.created_at)}
          </p>
        </div>
      </div>

      {/* Match-% badge row — fixed height to prevent layout shift */}
      <div style={{ height: '22px', display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
        {isProcessing ? (
          <span
            data-ch-shimmer
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#FFFBEB',
              color: '#D97706',
              border: '1px solid #FDE68A',
              animation: 'ch-shimmer 1.2s ease-in-out infinite'
            }}
          >
            Menganalisis kualifikasi...
          </span>
        ) : showBadge ? (
          <span
            title={`${rawScore}% · ${rawBand}${derivedVerdict ? ` · ${derivedVerdict} (Demo)` : ''}`}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              ...bandStyle!
            }}
          >
            {rawScore}% · {rawBand}{derivedVerdict ? ` · ${derivedVerdict}` : ''}
          </span>
        ) : candidate.resume_filename ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Menunggu Skrining
            </span>
            {onScreenCandidate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onScreenCandidate(candidate)
                }}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
              >
                Screen AI
              </button>
            )}
          </div>
        ) : null}
      </div>

      {candidate.resume_keywords && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          {candidate.resume_keywords.split(',').slice(0, 3).map((kw, i) => (
            <span key={i} style={{ fontSize: '10px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
              {kw.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Hover Quick Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #F1F5F9'
      }}>
        <span style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '12px',
          background: '#F0FDFA',
          color: '#0D9488',
          fontWeight: 600
        }}>
          {candidate.status}
        </span>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 150ms ease-in-out'
        }}>
          {/* View detail button */}
          <button
            type="button"
            title="Lihat Detail"
            aria-label={`Lihat detail ${candidate.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(candidate)
            }}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <EyeIcon size={14} color="#475569" />
          </button>

          {/* Change status button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              title="Ubah Status"
              aria-label="Ubah status kandidat"
              aria-expanded={showStatusDropdown}
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation()
                setShowStatusDropdown(!showStatusDropdown)
              }}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <EditIcon size={14} color="#475569" />
            </button>

            {showStatusDropdown && (
              <div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: '100%',
                  marginBottom: '6px',
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                  border: '1px solid #E2E8F0',
                  zIndex: 20,
                  width: '160px',
                  padding: '4px 0'
                }}
              >
                {stages.map(stage => (
                  <div
                    key={stage}
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => {
                      onStatusChange(candidate.id, stage)
                      setShowStatusDropdown(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onStatusChange(candidate.id, stage)
                        setShowStatusDropdown(false)
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      color: stage === candidate.status ? '#0D9488' : '#334155',
                      fontWeight: stage === candidate.status ? 700 : 400,
                      cursor: 'pointer',
                      background: stage === candidate.status ? '#F0FDFA' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = stage === candidate.status ? '#F0FDFA' : 'transparent'}
                  >
                    {stage}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp button */}
          <button
            type="button"
            title="Kirim Pesan WhatsApp"
            aria-label={`Kirim WhatsApp ke ${candidate.name}`}
            onClick={handleWhatsApp}
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <WhatsAppIcon size={14} color="#16A34A" />
          </button>

          {/* Email button */}
          <button
            type="button"
            title="Kirim Email"
            aria-label={`Kirim email ke ${candidate.name}`}
            onClick={handleEmail}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </button>

          {/* Delete button */}
          <button
            type="button"
            title="Hapus Kandidat"
            aria-label={`Hapus ${candidate.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(candidate)
            }}
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TrashIcon size={14} color="#DC2626" />
          </button>
        </div>
      </div>
      </div>
    </>
  )
}
