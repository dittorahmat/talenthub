import React from 'react'

export interface Job {
  id: number
  title: string
  location: string
  remote: string
  posted_at: string
  applicantCount: number
}

interface JobCardProps {
  job: Job
  onSelect: (id: number) => void
  onDelete: (job: Job) => void
  onOpenInbox?: (job: Job) => void
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

export const JobCard: React.FC<JobCardProps> = ({ job, onSelect, onDelete, onOpenInbox }) => {
  const initials = job.title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div
      onClick={() => onSelect(job.id)}
      style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#0D9488'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.12)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E2E8F0'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            background: '#0D9488',
            color: 'white',
            fontWeight: 700,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#1E293B' }}>{job.title}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
              {job.location}
              {job.remote === 'Yes' && ' · Remote'}
              {job.remote === 'Hybrid' && ' · Hybrid'}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: '#F0FDFA',
            color: '#0F766E',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            border: '1px solid #CCFBF1'
          }}>
            {job.applicantCount} pelamar
          </span>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>{timeAgo(job.posted_at)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            aria-label={`Upload CV untuk ${job.title}`}
            onClick={(e) => {
              e.stopPropagation()
              onOpenInbox?.(job)
            }}
            style={{
              background: 'white',
              color: '#0D9488',
              border: '1px solid #99F6E4',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Upload CV
          </button>
          <button
            type="button"
            aria-label={`Hapus ${job.title}`}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(job)
            }}
            style={{
              background: 'white',
              color: '#DC2626',
              border: '1px solid #FECACA',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Hapus
          </button>
          <button
            type="button"
            aria-label={`Lihat pipeline ${job.title}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(job.id)
            }}
          style={{
            background: '#0D9488',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Lihat Pipeline
        </button>
        </div>
      </div>
    </div>
  )
}
