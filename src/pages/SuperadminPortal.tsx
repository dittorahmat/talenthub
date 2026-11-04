import React, { useState, useEffect } from 'react'
import type { CreditTransactionType } from '../services/walletService'

interface SuperadminPortalProps {
  onBackToApp: () => void
}

interface OrganizationOverview {
  id: number
  name: string
  slug: string
  createdAt: string
  balance: number
  userCount: number
}

interface AuditLog {
  id: number
  walletId: number
  organizationId: number
  organizationName?: string
  amount: number
  type: CreditTransactionType
  description: string | null
  balanceAfter: number
  createdAt: string
}

const BADGE_STYLES_BY_TRANSACTION_TYPE: Record<CreditTransactionType, string> = {
  SUPERADMIN_ADJUSTMENT: 'border-slate-300 bg-slate-100 text-slate-800 font-semibold',
  TRIAL_GRANT: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PURCHASE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  INITIAL_GRANT: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CV_SCREENING: 'border-amber-200 bg-amber-50 text-amber-800',
  RESERVED: 'border-amber-200 bg-amber-50 text-amber-800',
  SETTLED: 'border-slate-200 bg-slate-50 text-slate-600',
  REFUND: 'border-sky-200 bg-sky-50 text-sky-800',
  REFUND_CORRUPTED_FILE: 'border-sky-200 bg-sky-50 text-sky-800',
  REFUND_PROCESSING_ERROR: 'border-sky-200 bg-sky-50 text-sky-800',
}

const formatTimestamp = (ts: string) => {
  if (!ts) return '-'
  return ts.replace('T', ' ').replace(/\.\d+Z?$/, '').slice(0, 19)
}

interface BatchQueueItem {
  id: number
  jobId: number
  filename: string
  status: string
  createdAt: string
}

interface SuperadminOverviewData {
  organizations: OrganizationOverview[]
  totalTenants: number
  totalUsers: number
  recentBatches: BatchQueueItem[]
  recentAuditLogs: AuditLog[]
}

interface InjectCreditResponse {
  success?: boolean
  error?: string
  wallet?: {
    organizationId: number
    balance: number
  }
}

export function SuperadminPortal({ onBackToApp }: SuperadminPortalProps) {
  const [data, setData] = useState<SuperadminOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [injectAmount, setInjectAmount] = useState<number>(100)
  const [injectNote, setInjectNote] = useState<string>('Penyesuaian saldo operasional')
  const [injectStatus, setInjectStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [injecting, setInjecting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/superadmin/overview')
      if (!res.ok) throw new Error('Gagal memuat ringkasan portal superadmin')
      const json = (await res.json()) as SuperadminOverviewData
      setData(json)
      if (json.organizations?.length > 0 && selectedOrgId === null) {
        setSelectedOrgId(json.organizations[0].id)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleInjectCredit = async (amountToExecute?: number) => {
    if (!selectedOrgId) return
    const amt = amountToExecute !== undefined ? amountToExecute : injectAmount
    if (isNaN(amt) || amt === 0) {
      setInjectStatus({ type: 'error', message: 'Jumlah kredit harus berupa angka bukan nol.' })
      return
    }

    setInjecting(true)
    setInjectStatus(null)

    try {
      const res = await fetch('/api/superadmin/inject-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          amount: amt,
          note: injectNote || 'Penyesuaian saldo operasional oleh superadmin'
        })
      })

      const result = (await res.json()) as InjectCreditResponse
      if (!res.ok) {
        throw new Error(result.error || 'Gagal melakukan mutasi saldo kredit.')
      }

      const newBal = result.wallet?.balance ?? '-'
      const targetOrg = data?.organizations.find((o) => o.id === selectedOrgId)
      setInjectStatus({
        type: 'success',
        message: `Berhasil menambahkan ${amt > 0 ? `+${amt}` : amt} kredit ke ${targetOrg?.name || `Org #${selectedOrgId}`}. Saldo baru: ${newBal} kredit.`
      })
      await fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi galat saat memproses penyesuaian saldo.'
      setInjectStatus({
        type: 'error',
        message: msg
      })
    } finally {
      setInjecting(false)
    }
  }

  const filteredOrgs = (data?.organizations || []).filter((org) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q) || org.id.toString() === q
  })

  const selectedOrg = data?.organizations.find((o) => o.id === selectedOrgId)

  const kpiCards = [
    {
      label: 'Total Tenant Aktif',
      value: data ? data.totalTenants : '-',
      caption: 'Organisasi terdaftar di database D1'
    },
    {
      label: 'Total Pengguna Terverifikasi',
      value: data ? data.totalUsers : '-',
      caption: 'Akun session Better Auth'
    },
    {
      label: 'Antrean Batch Terakhir',
      value: data ? data.recentBatches.length : '-',
      caption: 'Aktivitas Cloudflare Queue'
    }
  ]

  return (
    <div className="min-h-screen bg-[var(--ground)] text-slate-800 flex flex-col font-sans selection:bg-slate-200 selection:text-slate-900 py-10 px-8">
      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto space-y-8">
        {/* Page Hero Header - Consistent with JobsDashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center text-white font-mono font-bold text-base shadow-xs">
                T
              </div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-bold text-2xl tracking-tight text-slate-900 leading-none">
                  TalentHub
                </h1>
                <span className="text-[11px] font-mono font-semibold tracking-wide uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Superadmin Console
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              TalentHub oleh PT. Sirius Global Technologies · Pengelolaan Multi-Tenant, Ledger Transaksi & Kontrol Antrean Platform
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-lg transition shadow-xs disabled:opacity-50"
            >
              {loading ? 'Menyinkronkan...' : 'Perbarui Data'}
            </button>
            <button
              type="button"
              onClick={onBackToApp}
              className="text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-lg transition shadow-xs"
            >
              ← Kembali ke Workspace
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 shadow-xs">
            <span className="font-semibold">Galat koneksi:</span> {error}
          </div>
        )}

        {/* Distinct 3-Card KPI Section */}
        <section aria-label="Ringkasan Platform">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kpiCards.map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    {kpi.label}
                  </span>
                  <div className="text-3xl font-bold tracking-tight text-slate-900 mt-2.5 tabular-nums">
                    {kpi.value}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  {kpi.caption}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Structured Form Card: Credit Ledger Adjustment */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Penyesuaian Saldo Ledger (Superadmin Grant)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Mutasi saldo dompet tenant dicatat langsung ke ledger transaksi resmi dengan tipe{' '}
                <code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                  SUPERADMIN_ADJUSTMENT
                </code>.
              </p>
            </div>
          </div>

          {injectStatus && (
            <div
              className={`text-xs p-4 rounded-lg border ${
                injectStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {injectStatus.message}
            </div>
          )}

          <div className="space-y-4">
            {/* Row 1: Target Tenant & Saldo Saat Ini + Quick Presets */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
              <div className="lg:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tenant Organisasi Tujuan
                </label>
                <select
                  value={selectedOrgId || ''}
                  onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 font-sans shadow-xs"
                >
                  {data?.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} (#{org.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Saldo Saat Ini
                </label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-700 shadow-xs flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Org #{selectedOrgId ?? '-'}:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {selectedOrg?.balance ?? 0} <span className="font-normal text-slate-500 text-[11px]">kredit</span>
                  </span>
                </div>
              </div>

              <div className="lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Preset Cepat (Isi Form)
                </label>
                <div className="flex items-center gap-2">
                  {[50, 100, 250, 500].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      disabled={injecting || !selectedOrgId}
                      onClick={() => setInjectAmount(preset)}
                      className={`flex-1 text-xs font-mono font-medium py-2 px-2.5 rounded-lg transition disabled:opacity-50 text-center shadow-xs border ${
                        injectAmount === preset
                          ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                          : 'text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Amount, Audit Note & Submit Button */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end pt-2">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Jumlah Kredit
                </label>
                <input
                  type="number"
                  value={injectAmount}
                  onChange={(e) => setInjectAmount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono shadow-xs"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Catatan Audit / Alasan Mutasi
                </label>
                <input
                  type="text"
                  value={injectNote}
                  onChange={(e) => setInjectNote(e.target.value)}
                  placeholder="Contoh: Penyesuaian saldo operasional..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
                />
              </div>

              <div className="md:col-span-3">
                <button
                  type="button"
                  disabled={injecting || !selectedOrgId}
                  onClick={() => handleInjectCredit()}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition shadow-xs disabled:opacity-50 text-center flex items-center justify-center gap-2"
                >
                  {injecting ? 'Memproses...' : 'Terapkan Mutasi'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tenant Organizations Table Card */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Daftar Tenant Organisasi
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh ruang kerja dan dompet kredit terdaftar dalam platform.
              </p>
            </div>
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau slug tenant..."
                className="w-full sm:w-72 bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6 font-semibold w-24">ID</th>
                  <th className="py-4 px-6 font-semibold">Nama Organisasi</th>
                  <th className="py-4 px-6 font-semibold">Slug Tenant</th>
                  <th className="py-4 px-6 font-semibold text-right">Saldo Dompet</th>
                  <th className="py-4 px-6 font-semibold text-center">Pengguna</th>
                  <th className="py-4 px-6 font-semibold text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Tidak ada tenant yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-400">#{org.id}</td>
                      <td className="py-4 px-6 font-semibold text-slate-900">{org.name}</td>
                      <td className="py-4 px-6 font-mono text-slate-500 text-[11px]">{org.slug}</td>
                      <td className="py-4 px-6 text-right font-mono tabular-nums">
                        <span
                          className={`font-bold ${
                            org.balance > 0 ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {org.balance}
                        </span>{' '}
                        <span className="text-slate-400 text-[11px]">kredit</span>
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-slate-600">{org.userCount}</td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrgId(org.id)
                            setInjectAmount(100)
                            handleInjectCredit(100)
                          }}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-1.5 rounded-md transition shadow-xs"
                        >
                          +100 Kredit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit Trail Panel Card */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Log Audit Transaksi Kredit Terkini
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              15 mutasi ledger terakhir di seluruh organisasi untuk pengawasan dan kepatuhan operasional.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6 font-semibold w-48">Waktu Transaksi</th>
                  <th className="py-4 px-6 font-semibold">Organisasi</th>
                  <th className="py-4 px-6 font-semibold">Tipe Mutasi</th>
                  <th className="py-4 px-6 font-semibold text-right">Jumlah</th>
                  <th className="py-4 px-6 font-semibold text-right">Saldo Akhir</th>
                  <th className="py-4 px-6 font-semibold">Keterangan Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                {!data?.recentAuditLogs || data.recentAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Belum ada catatan mutasi transaksi kredit di ledger.
                    </td>
                  </tr>
                ) : (
                  data.recentAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-500 text-[11px]">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900">
                        {log.organizationName || `Org #${log.organizationId}`}
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            BADGE_STYLES_BY_TRANSACTION_TYPE[log.type] || 'border-slate-200 bg-slate-100 text-slate-600'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td
                        className={`py-4 px-6 text-right font-mono tabular-nums font-bold ${
                          log.amount > 0 ? 'text-teal-700' : log.amount < 0 ? 'text-rose-700' : 'text-slate-500'
                        }`}
                      >
                        {log.amount > 0 ? `+${log.amount}` : log.amount}
                      </td>
                      <td className="py-4 px-6 text-right font-mono tabular-nums text-slate-700 font-medium">
                        {log.balanceAfter}
                      </td>
                      <td className="py-4 px-6 text-slate-600 max-w-sm truncate" title={log.description || ''}>
                        {log.description || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
