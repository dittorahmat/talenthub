import React, { useState, useEffect } from 'react'

interface JobItem {
  id: number
  title: string
  location: string
  remote: string
  posted_at: string
}

interface CareerPortalData {
  organization: {
    name: string
    slug: string
  }
  jobs: JobItem[]
}

export function PublicCareerPage() {
  const [data, setData] = useState<CareerPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null)

  // Form inputs
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Extract slug from URL hash e.g. #/careers/:orgSlug or #/careers/:orgSlug/:jobId
  const getSlugFromHash = () => {
    const hash = window.location.hash || ''
    const match = hash.match(/#\/careers\/([^/?#]+)/)
    return match ? match[1] : 'tech-satu-solusi'
  }

  const orgSlug = getSlugFromHash()

  useEffect(() => {
    fetch(`/api/public/careers/${orgSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Halaman karir tidak ditemukan')
        return res.json() as Promise<CareerPortalData>
      })
      .then((resData) => {
        setData(resData)
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat lowongan kerja')
      })
      .finally(() => setLoading(false))
  }, [orgSlug])

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return
    if (!name.trim() || !email.trim()) {
      setFormError('Nama lengkap dan email wajib diisi.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const fd = new FormData()
    fd.append('name', name.trim())
    fd.append('email', email.trim())
    if (phone.trim()) fd.append('phone', phone.trim())
    if (file) fd.append('file', file)

    try {
      const res = await fetch(`/api/public/careers/${orgSlug}/jobs/${selectedJob.id}/apply`, {
        method: 'POST',
        body: fd,
      })

      const resJson = await res.json() as any
      if (!res.ok) {
        throw new Error(resJson.error || 'Gagal mengirim lamaran')
      }

      setSubmitSuccess(true)
      setName('')
      setEmail('')
      setPhone('')
      setFile(null)
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kendala saat mengirim lamaran.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 text-xs">
        Memuat lowongan karir...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-base font-bold text-slate-900 mb-1">Halaman Karir Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 max-w-sm">{error || 'Perusahaan tidak memiliki lowongan aktif saat ini.'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Brand Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white text-xs font-bold tracking-wider">
              {data.organization.name.charAt(0)}
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight block">
                {data.organization.name}
              </span>
              <span className="text-[11px] text-slate-400 block -mt-0.5">Portal Karir Resmi</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {data.jobs.length} Posisi Terbuka
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-slate-200 py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-3">
          <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
            Karir & Kesempatan Bergabung
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Berkembang Bersama {data.organization.name}
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Temukan peran yang sesuai dengan keahlian Anda dan jadilah bagian dari perjalanan kami membangun solusi terbaik.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Job List (left) */}
          <div className="md:col-span-7 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lowongan Pekerjaan Aktif
            </h2>
            {data.jobs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                Saat ini belum ada posisi baru yang dibuka.
              </div>
            ) : (
              <div className="space-y-3">
                {data.jobs.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => {
                      setSelectedJob(j)
                      setSubmitSuccess(false)
                      setFormError(null)
                    }}
                    className={`p-5 rounded-xl border transition-all cursor-pointer ${
                      selectedJob?.id === j.id
                        ? 'bg-white border-teal-600 shadow-sm ring-1 ring-teal-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{j.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {j.location}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {j.remote === 'Yes' ? 'Remote' : j.remote === 'Hybrid' ? 'Hybrid' : 'Onsite'}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            Diposting {j.posted_at}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          selectedJob?.id === j.id
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Lamar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Application Form Drawer / Card (right) */}
          <div className="md:col-span-5">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs sticky top-24 space-y-4">
              {selectedJob ? (
                <>
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">
                      Formulir Lamaran
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedJob.title}</h3>
                    <p className="text-xs text-slate-500">{selectedJob.location} · {selectedJob.remote} Remote</p>
                  </div>

                  {submitSuccess ? (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-center space-y-2">
                      <h4 className="text-xs font-bold text-teal-900">Lamaran Anda Terkirim</h4>
                      <p className="text-xs text-teal-700 leading-relaxed">
                        Terima kasih telah melamar posisi ini. Tim rekrutmen kami akan segera meninjau kualifikasi Anda.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSubmitSuccess(false)}
                        className="mt-2 text-xs font-semibold text-teal-800 underline"
                      >
                        Kirim lamaran lain
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplySubmit} className="space-y-3.5">
                      {formError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                          {formError}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Lengkap <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Nama lengkap Anda..."
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Aktif <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nama@email.com"
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nomor WhatsApp / Telepon
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="081234567890"
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Dokumen Resume / CV (PDF, DOCX, TXT)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {submitting ? 'Mengirim Lamaran...' : 'Kirim Lamaran Sekarang'}
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-medium text-slate-600">Pilih salah satu posisi lowongan</p>
                  <p>Formulir pendaftaran akan muncul di sini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
