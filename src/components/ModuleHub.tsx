import React from 'react'

interface ModuleHubProps {
  onSelectModule: (key: string) => void
}

interface ModuleTile {
  key: string
  number: string
  title: string
  titleEn: string
  description: string
  live: boolean
}

const MODULES: ModuleTile[] = [
  {
    key: '01',
    number: '01',
    title: 'Asisten HR',
    titleEn: 'HR Assistant',
    description: 'Tanya jawab operasional, saldo cuti, reimbursement & prosedur internal.',
    live: true,
  },
  {
    key: '02',
    number: '02',
    title: 'Otak Perusahaan',
    titleEn: 'Company Brain',
    description: 'Basis pengetahuan perusahaan terpusat, SOP, kebijakan & dokumen.',
    live: false,
  },
  {
    key: '03',
    number: '03',
    title: 'Intelijen Talenta',
    titleEn: 'Talent Intelligence',
    description: 'Pipeline kandidat, screening otomatis, evaluasi kualifikasi & Kanban.',
    live: true,
  },
  {
    key: '04',
    number: '04',
    title: 'Penempatan Proyek',
    titleEn: 'Project Staffing',
    description: 'Alokasi talenta ke proyek, matching skill, ketersediaan & beban kerja.',
    live: false,
  },
  {
    key: '05',
    number: '05',
    title: 'Operasional HR',
    titleEn: 'HR Operations',
    description: 'Administrasi kepegawaian, kontrak, absensi & pengelolaan data karyawan.',
    live: false,
  },
  {
    key: '06',
    number: '06',
    title: 'Kinerja & Pengembangan',
    titleEn: 'Performance & Development',
    description: 'Penilaian kinerja & jalur pengembangan, OKR, feedback & pelatihan.',
    live: false,
  },
  {
    key: '07',
    number: '07',
    title: 'Intelijen Tenaga Kerja',
    titleEn: 'Workforce Intelligence',
    description: 'Analitik & perencanaan tenaga kerja, tren, attrition & forecasting.',
    live: false,
  },
  {
    key: '08',
    number: '08',
    title: 'Pusat Komando Manajemen',
    titleEn: 'Management Command Center',
    description: 'Dasbor eksekutif, ringkasan KPI, headcount & insight strategis.',
    live: false,
  },
]

export const ModuleHub: React.FC<ModuleHubProps> = ({ onSelectModule }) => {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '32px 24px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Sirius Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                aria-hidden="true"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '8px',
                  background: '#0D9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                T
              </div>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Talent<span style={{ color: '#0D9488' }}>Hub</span>
              </h1>
            </div>
            <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: '13px', letterSpacing: '0.01em' }}>
              PT. Sirius Global Technologies &middot; Platform HR Terpadu
            </p>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#0D9488',
              background: '#CCFBF1',
              border: '1px solid #99F6E4',
              padding: '6px 10px',
              borderRadius: '999px',
            }}
          >
            Demo · 8 Modul
          </span>
        </div>

        {/* Intro */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Pilih modul untuk memulai
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
            Platform TalentHub terdiri dari 8 modul. Modul aktif dapat langsung digunakan; modul lainnya pratinjau jujur untuk full build.
          </p>
        </div>

        {/* Tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {MODULES.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-label={`${m.number} ${m.title} ${m.live ? ',  tersedia' : ',  segera hadir'}`}
              onClick={() => onSelectModule(m.key)}
              style={{
                textAlign: 'left',
                background: m.live ? 'white' : '#FFFFFF',
                border: m.live ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '18px 16px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minHeight: '148px',
                boxShadow: m.live ? '0 4px 16px rgba(13,148,136,0.10), 0 1px 3px rgba(0,0,0,0.04)' : '0 1px 2px rgba(0,0,0,0.04)',
                opacity: m.live ? 1 : 0.92,
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = m.live
                  ? '0 8px 24px rgba(13,148,136,0.14), 0 2px 6px rgba(0,0,0,0.06)'
                  : '0 4px 12px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = m.live
                  ? '0 4px 16px rgba(13,148,136,0.10), 0 1px 3px rgba(0,0,0,0.04)'
                  : '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              {/* top row: number + live dot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: m.live ? '#0D9488' : '#94A3B8',
                    background: m.live ? '#CCFBF1' : '#F1F5F9',
                    border: `1px solid ${m.live ? '#99F6E4' : '#E2E8F0'}`,
                    padding: '3px 8px',
                    borderRadius: '999px',
                    lineHeight: 1,
                  }}
                >
                  {m.number}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: m.live ? '#0D9488' : '#CBD5E1',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: m.live ? '#0F172A' : '#334155', lineHeight: 1.25 }}>
                  {m.title}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginTop: '2px', letterSpacing: '0.02em' }}>
                  {m.titleEn}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', lineHeight: 1.5, flex: 1 }}>
                {m.description}
              </p>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: m.live ? '#0D9488' : '#94A3B8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {m.live ? 'Buka →' : 'Pratinjau →'}
              </span>

              {m.live && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: '#0D9488',
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748B',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'white', border: '1.5px solid #0D9488', display: 'inline-block' }} /> Aktif
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'white', border: '1px solid #E2E8F0', display: 'inline-block' }} /> Segera hadir
          </span>
          <span style={{ color: '#94A3B8' }}>&middot; Klik modul aktif untuk masuk; modul pratinjau menampilkan ruang lingkup full build.</span>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '16px',
            borderTop: '1px solid #E2E8F0',
            fontSize: '12px',
            color: '#94A3B8',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span>TalentHub oleh PT. Sirius Global Technologies</span>
          <span>Demo MVP, data simulasi, bukan data produksi.</span>
        </div>
      </div>
    </div>
  )
}
