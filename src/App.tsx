import React, { useState } from 'react'
import { JobsDashboard } from './pages/JobsDashboard'
import { KanbanBoard } from './pages/KanbanBoard'
import { ModuleHub } from './components/ModuleHub'
import { ComingSoonPanel } from './components/ComingSoonPanel'
import { HrAssistantChat } from './components/HrAssistantChat'

type HubView = 'hub' | 'jobs' | 'assistant' | `comingsoon:${string}`

const COMING_SOON_META: Record<string, { title: string; number: string; scope: string }> = {
  '02': {
    title: 'Company Brain',
    number: '02',
    scope:
      'Company Brain menghimpun seluruh pengetahuan perusahaan, SOP, kebijakan SDM, handbook, dan dokumen legal, dalam satu basis pengetahuan yang dapat ditelusuri via chat, lengkap dengan versioning dan approval berjenjang. Di full build, setiap jawaban Asisten HR akan menautkan langsung ke sumber dokumen resmi sehingga karyawan selalu merujuk versi terbaru.',
  },
  '04': {
    title: 'Project Staffing',
    number: '04',
    scope:
      'Project Staffing mencocokkan kebutuhan proyek dengan talenta yang tersedia berdasarkan skill, sertifikasi, ketersediaan, dan beban kerja. Full build menyediakan rekomendasi penempatan otomatis, simulasi kapasitas tim, dan sinkronisasi dengan modul Kinerja untuk menilai kesiapan personel sebelum penugasan.',
  },
  '05': {
    title: 'HR Operations',
    number: '05',
    scope:
      'HR Operations mengelola siklus administrasi kepegawaian, pengelolaan kontrak, onboarding dan offboarding, absensi, shift, serta master data karyawan, dengan alur persetujuan digital. Full build menambahkan tanda tangan elektronik, integrasi absensi biometrik, dan audit trail lengkap untuk kepatuhan.',
  },
  '06': {
    title: 'Performance & Development',
    number: '06',
    scope:
      'Performance & Development menjalankan penilaian kinerja berbasis OKR dan KPI, feedback 360°, serta perencanaan pengembangan individu (IDP) dan jalur karier. Full build menghubungkan hasil penilaian ke rekomendasi pelatihan, rotasi penugasan, dan matriks suksesi untuk pengembangan talenta berkelanjutan.',
  },
  '07': {
    title: 'Workforce Intelligence',
    number: '07',
    scope:
      'Workforce Intelligence menyajikan analitik tenaga kerja, tren attrition, kesenjangan skill, diversitas, dan forecasting kebutuhan headcount. Full build menghadirkan dasbor prediktif dengan peringatan dini turnover, perencanaan skenario headcount, dan insight berbasis data untuk keputusan strategis.',
  },
  '08': {
    title: 'Management Command Center',
    number: '08',
    scope:
      'Management Command Center adalah dasbor eksekutif yang merangkum KPI HR, status rekrutmen, utilisasi proyek, dan kesehatan organisasi dalam satu layar. Full build menyediakan ringkasan harian otomatis, drill-down per divisi, dan ekspor laporan siap rapat pimpinan.',
  },
}

export default function App() {
  const [view, setView] = useState<HubView>('hub')
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)

  const handleSelectModule = (key: string) => {
    if (key === '01') setView('assistant')
    else if (key === '03') {
      setSelectedJobId(null)
      setView('jobs')
    } else {
      setView(`comingsoon:${key}`)
    }
  }

  if (view === 'hub') {
    return <ModuleHub onSelectModule={handleSelectModule} />
  }

  if (view === 'assistant') {
    return <HrAssistantChat onBack={() => setView('hub')} />
  }

  if (view.startsWith('comingsoon:')) {
    const key = view.split(':')[1]
    const meta = COMING_SOON_META[key] ?? { title: `Modul ${key}`, number: key, scope: 'Modul ini segera hadir di full build dengan ruang lingkup lengkap yang akan diumumkan.' }
    return (
      <ComingSoonPanel
        moduleTitle={meta.title}
        moduleNumber={meta.number}
        scopeText={meta.scope}
        onBack={() => setView('hub')}
      />
    )
  }

  // view === 'jobs', existing recruitment flow untouched
  return (
    <div>
      {/* Hub-level back bar, visible on jobs entry / dashboard, but not when inside kanban (kanban has its own back) */}
      {selectedJobId === null && (
        <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '10px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              aria-label="Kembali ke hub"
              onClick={() => setView('hub')}
              style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span aria-hidden="true">←</span> Hub
            </button>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Talent Intelligence, Modul 03</span>
          </div>
        </div>
      )}
      {selectedJobId === null ? (
        <JobsDashboard onSelectJob={(id) => setSelectedJobId(id)} />
      ) : (
        <KanbanBoard jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />
      )}
    </div>
  )
}
