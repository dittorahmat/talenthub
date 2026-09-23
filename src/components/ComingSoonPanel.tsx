import React, { useEffect } from 'react'

interface ComingSoonPanelProps {
  moduleTitle: string
  moduleNumber: string
  scopeText: string
  onBack: () => void
}

export const ComingSoonPanel: React.FC<ComingSoonPanelProps> = ({ moduleTitle, moduleNumber, scopeText, onBack }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '32px 24px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Back */}
        <button
          type="button"
          aria-label="Kembali ke hub"
          onClick={onBack}
          style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '24px',
          }}
        >
          <span aria-hidden="true">←</span> Kembali ke Hub
        </button>

        {/* Card */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* top accent */}
          <div style={{ height: '4px', background: '#E2E8F0' }} aria-hidden="true" />

          <div style={{ padding: '28px 24px 24px' }}>
            {/* badge */}
            <div style={{ marginBottom: '14px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#64748B',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  padding: '5px 10px',
                  borderRadius: '999px',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', display: 'inline-block' }} aria-hidden="true" />
                Segera hadir di full build
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#94A3B8',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '3px 8px',
                  borderRadius: '999px',
                }}
              >
                {moduleNumber}
              </span>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {moduleTitle}
              </h1>
            </div>

            <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#334155', lineHeight: 1.65 }}>
              {scopeText}
            </p>

            <div
              style={{
                marginTop: '20px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '12.5px',
                color: '#64748B',
                lineHeight: 1.6,
              }}
            >
              Modul ini belum aktif pada demo MVP. Panel ini menunjukkan ruang lingkup yang direncanakan untuk full build, tidak ada kontrol interaktif di sini.
            </div>
          </div>
        </div>

        <p style={{ marginTop: '16px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
          TalentHub oleh PT. Sirius Global Technologies
        </p>
      </div>
    </div>
  )
}
