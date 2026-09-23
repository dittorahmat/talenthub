import React, { useState } from 'react'

interface AddCandidateFormProps {
  jobId: number
  stages: string[]
  onClose: () => void
  onSuccess: () => void
}

export const AddCandidateForm: React.FC<AddCandidateFormProps> = ({
  jobId,
  stages,
  onClose,
  onSuccess
}) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'JobStreet',
    status: stages[0] || 'Applied',
    notes: ''
  })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sources = ['JobStreet', 'Kalibrr', 'LinkedIn', 'Indeed Indonesia', 'Referral', 'Company Website']

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
        setError('Format berkas harus berupa PDF atau DOCX')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran berkas maksimal 5MB')
        return
      }
      setError(null)
      setResumeFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nama dan Email wajib diisi!')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Format email tidak valid')
      return
    }

    setLoading(true)
    try {
      // 1. Create applicant
      const res = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          source: form.source,
          status: form.status
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menambahkan pelamar')
      }

      const created = await res.json()

      // 2. Upload resume if selected
      if (resumeFile && created.id) {
        const formData = new FormData()
        formData.append('resume', resumeFile)
        await fetch(`/api/applicants/${created.id}/resume`, {
          method: 'POST',
          body: formData
        })
      }

      // 3. Add initial note if provided
      if (form.notes.trim() && created.id) {
        await fetch(`/api/applicants/${created.id}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: form.notes.trim(),
            author: 'HR Admin'
          })
        })
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          width: '100%',
          maxWidth: '520px',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>+ Tambah Pelamar Baru</h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Rian Pratama"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Alamat Email *
            </label>
            <input
              type="email"
              required
              placeholder="rian.pratama@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Nomor WhatsApp / HP
            </label>
            <input
              type="tel"
              placeholder="+62 812-xxxx-xxxx"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Sumber Pelamar
              </label>
              <select
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', background: 'white' }}
              >
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Tahap Pipeline
              </label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', background: 'white' }}
              >
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Upload Resume / CV (PDF atau DOCX)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              style={{ fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Catatan Awal (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Catatan tambahan tentang kualifikasi atau rekomendasi kandidat..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 16px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '9px 20px', background: '#0D9488', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? 'Menyimpan...' : 'Tambah Kandidat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
