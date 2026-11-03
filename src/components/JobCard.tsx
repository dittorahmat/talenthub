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
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

export const JobCard: React.FC<JobCardProps> = ({ job, onSelect, onDelete, onOpenInbox }) => {
  const initials = job.title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div
      onClick={() => onSelect(job.id)}
      style={{
        background: 'var(--surface)',
        padding: '20px',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-control)',
            background: 'var(--raised)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {job.title}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              {job.location} · {job.remote === 'Yes' ? 'Remote' : 'On-site'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(job)
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: '14px',
            padding: '4px',
            cursor: 'pointer'
          }}
          title="Delete requisition"
        >
          ✕
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="tabular-numbers" style={{ fontWeight: 700, color: 'var(--text)' }}>
            {job.applicantCount}
          </span>
          <span style={{ color: 'var(--muted)' }}>applicants</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            {timeAgo(job.posted_at)}
          </span>
        </div>

        {onOpenInbox && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenInbox(job)
            }}
            style={{
              background: 'var(--raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            AI Screening Inbox →
          </button>
        )}
      </div>
    </div>
  )
}
