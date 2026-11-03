import React, { useState, useEffect } from 'react'
import { JobCard, Job } from '../components/JobCard'
import { SearchIcon } from '../components/Icons'
import { ScreeningInbox } from '../components/ScreeningInbox'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { CreditPill } from '../components/CreditPill'
import { orgFetch, useOrg } from '../context/OrgContext'

interface JobsDashboardProps {
  onSelectJob: (id: number) => void
}

export const JobsDashboard: React.FC<JobsDashboardProps> = ({ onSelectJob }) => {
  const { currentOrg } = useOrg()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newJob, setNewJob] = useState({ title: '', location: '', remote: 'No' })
  const [selectedInboxJob, setSelectedInboxJob] = useState<Job | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!showAddModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAddModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddModal])

  const loadJobs = () => {
    setLoading(true)
    setLoadError(null)
    orgFetch('/api/jobs')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<any>
      })
      .then(data => setJobs(data))
      .catch(() => setLoadError('Gagal memuat lowongan, backend tidak merespons.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadJobs()
  }, [currentOrg.id])

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newJob.title || !newJob.location) return
    await orgFetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newJob)
    })
    setShowAddModal(false)
    setNewJob({ title: '', location: '', remote: 'No' })
    loadJobs()
  }

  const handleDeleteJob = async (job: Job) => {
    if (!window.confirm(`Hapus lowongan "${job.title}" beserta ${job.applicantCount} pelamar? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      await orgFetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
      loadJobs()
    } catch (err) {
      console.error(err)
      loadJobs()
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) ||
                          job.location.toLowerCase().includes(search.toLowerCase())
    const matchesLocation = locationFilter === 'all' || job.location.toLowerCase().includes(locationFilter.toLowerCase())
    return matchesSearch && matchesLocation
  })

  if (selectedInboxJob) {
    return (
      <ScreeningInbox
        jobId={selectedInboxJob.id}
        jobTitle={selectedInboxJob.title}
        onBack={() => setSelectedInboxJob(null)}
        onPromoted={() => loadJobs()}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', padding: '40px 32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-control)',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '16px',
                fontFamily: 'var(--font-mono)'
              }}>
                T
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  TalentHub
                </h1>
              </div>
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
              TalentHub oleh PT. Sirius Global Technologies · Sistem Pelacakan & Skrining Pelamar
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CreditPill />
            <WorkspaceSwitcher />
            <button
              type="button"
              aria-label="Buat lowongan baru"
              onClick={() => setShowAddModal(true)}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 'var(--radius-control)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              + Buat Lowongan Baru
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div style={{
          background: 'var(--surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '28px'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
              <SearchIcon size={16} color="var(--muted)" />
            </span>
            <input
              type="text"
              aria-label="Cari lowongan atau lokasi"
              placeholder="Cari lowongan kerja atau lokasi penempatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                fontSize: '13px',
                boxSizing: 'border-box',
                background: 'var(--surface)',
                color: 'var(--text)'
              }}
            />
          </div>
          <select
            aria-label="Filter lokasi"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              fontSize: '13px',
              background: 'var(--surface)',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            <option value="all">Semua Lokasi</option>
            <option value="jakarta">Jakarta</option>
            <option value="bandung">Bandung</option>
            <option value="surabaya">Surabaya</option>
          </select>
        </div>

        {/* Job List / States */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
            Memuat lowongan kerja...
          </div>
        ) : loadError ? (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #FECACA', padding: '40px 24px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#991B1B', fontWeight: 700 }}>{loadError}</h3>
            <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: '13px' }}>Periksa koneksi backend, lalu muat ulang daftar.</p>
            <button type="button" onClick={loadJobs} style={{ background: '#0D9488', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Muat ulang</button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px dashed #CBD5E1',
            padding: '64px 24px',
            textAlign: 'center'
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1E293B', fontWeight: 600 }}>
              Belum ada lowongan pekerjaan
            </h3>
            <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: '14px' }}>
              Mulai proses perekrutan Anda dengan membuat lowongan kerja pertama di TalentHub.
            </p>
            <button
              type="button"
              aria-label="Buat lowongan baru"
              onClick={() => setShowAddModal(true)}
              style={{
                background: '#0D9488',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Buat Lowongan Baru
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px'
          }}>
            {filteredJobs.map(job => (
              <JobCard key={job.id} job={job} onSelect={onSelectJob} onDelete={handleDeleteJob} onOpenInbox={(j) => setSelectedInboxJob(j)} />
            ))}
          </div>
        )}

        {/* Modal New Job */}
        {showAddModal && (
          <div
            onClick={() => setShowAddModal(false)}
            role="presentation"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px'
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Buat lowongan baru"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                width: '100%',
                maxWidth: '480px',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Buat Lowongan Pekerjaan Baru</h3>
                <button
                  type="button"
                  aria-label="Tutup modal"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateJob} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Judul Pekerjaan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Senior Fullstack Engineer"
                    value={newJob.title}
                    onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Lokasi Penempatan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jakarta, Indonesia"
                    value={newJob.location}
                    onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Kebijakan Remote
                  </label>
                  <select
                    value={newJob.remote}
                    onChange={e => setNewJob({ ...newJob, remote: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="No">Kantor / On-site</option>
                    <option value="Yes">100% Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{ padding: '9px 16px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '9px 20px', background: '#0D9488', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Simpan Lowongan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
