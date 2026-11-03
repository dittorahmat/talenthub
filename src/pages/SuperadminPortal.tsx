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
  SUPERADMIN_ADJUSTMENT: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  TRIAL_GRANT: 'border-teal-200 bg-teal-50 text-teal-700',
  PURCHASE: 'border-teal-200 bg-teal-50 text-teal-700',
  INITIAL_GRANT: 'border-teal-200 bg-teal-50 text-teal-700',
  CV_SCREENING: 'border-amber-200 bg-amber-50 text-amber-700',
  RESERVED: 'border-amber-200 bg-amber-50 text-amber-700',
  SETTLED: 'border-slate-200 bg-slate-100 text-slate-600',
  REFUND: 'border-sky-200 bg-sky-50 text-sky-700',
  REFUND_CORRUPTED_FILE: 'border-sky-200 bg-sky-50 text-sky-700',
  REFUND_PROCESSING_ERROR: 'border-sky-200 bg-sky-50 text-sky-700',
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
      const res = await fetch('/api/superadmin/overview', {
        headers: { 'X-Superadmin-Key': 'dev-bypass' }
      })
      if (!res.ok) throw new Error('Gagal memuat ringkasan portal superadmin')
      const json = (await res.json()) as SuperadminOverviewData
      setData(json)
      if (json.organizations?.length > 0 && selectedOrgId === null) {
        setSelectedOrgId(json.organizations[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleInjectCredit = async (amountToAdd?: number) => {
    if (!selectedOrgId) return
    const amt = amountToAdd || injectAmount
    if (isNaN(amt) || amt === 0) return

    setInjecting(true)
    setInjectStatus(null)

    try {
      const res = await fetch('/api/superadmin/inject-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Superadmin-Key': 'dev-bypass'
        },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          amount: amt,
          note: injectNote || `Penyesuaian manual (${amt > 0 ? '+' : ''}${amt} kredit)`
        })
      })

      const result: any = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal memperbarui saldo')

      const targetOrg = data?.organizations.find((o) => o.id === selectedOrgId)
      setInjectStatus({
        type: 'success',
        message: `Berhasil menambahkan ${amt} kredit ke ${targetOrg?.name || `ID #${selectedOrgId}`}. Saldo baru: ${result.wallet?.balance ?? '-'} kredit.`
      })
      await fetchData()
    } catch (err: any) {
      setInjectStatus({
        type: 'error',
        message: err.message || 'Gagal melakukan mutasi kredit'
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Console Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-teal-100" />
            <span className="font-bold text-sm tracking-tight text-slate-900">TalentHub Console</span>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              superadmin
            </span>
          </div>
          <span className="hidden md:inline text-xs text-slate-500 border-l border-slate-200 pl-4">
            Pengelolaan Multi-Tenant & Audit Ledger
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-md transition shadow-xs disabled:opacity-50"
          >
            {loading ? 'Menyinkronkan...' : 'Perbarui Data'}
          </button>
          <button
            onClick={onBackToApp}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-1.5 rounded-md transition shadow-xs font-sans"
          >
            ← Kembali ke Aplikasi
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
            <span className="font-semibold">Galat koneksi:</span> {error}
          </div>
        )}

        {/* Utilitarian KPI Row */}
        <section aria-label="Ringkasan Platform">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border border-slate-200 rounded-lg bg-white shadow-xs">
            <div className="p-5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tenant Aktif</div>
              <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5 tabular-nums">
                {data ? data.totalTenants : '-'}
              </div>
              <div className="text-[12px] text-slate-500 mt-1">Organisasi terdaftar di database D1</div>
            </div>

            <div className="p-5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pengguna Terverifikasi</div>
              <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5 tabular-nums">
                {data ? data.totalUsers : '-'}
              </div>
              <div className="text-[12px] text-slate-500 mt-1">Akun session Better Auth</div>
            </div>

            <div className="p-5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Antrean Batch Terakhir</div>
              <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5 tabular-nums">
                {data ? data.recentBatches.length : '-'}
              </div>
              <div className="text-[12px] text-slate-500 mt-1">Aktivitas Cloudflare Queue</div>
            </div>
          </div>
        </section>

        {/* Credit Ledger Adjustment Form */}
        <section className="border border-slate-200 rounded-lg bg-white p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Penyesuaian Saldo Ledger (Superadmin Grant)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mutasi saldo dompet tenant dicatat langsung ke ledger transaksi resmi dengan tipe{' '}
                <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-mono text-[11px]">SUPERADMIN_ADJUSTMENT</code>.
              </p>
            </div>
            {selectedOrgId && data?.organizations && (
              <div className="text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                Target Terpilih: Org #{selectedOrgId} (Saldo:{' '}
                <span className="text-slate-900 font-bold">
                  {data.organizations.find((o) => o.id === selectedOrgId)?.balance ?? 0}
                </span>{' '}
                kredit)
              </div>
            )}
          </div>

          {injectStatus && (
            <div
              className={`text-xs p-3 rounded-md border ${
                injectStatus.type === 'success'
                  ? 'bg-teal-50 border-teal-200 text-teal-800 font-medium'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {injectStatus.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tenant Organisasi</label>
              <select
                value={selectedOrgId || ''}
                onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-sans shadow-xs"
              >
                {data?.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} (Saldo: {org.balance} kredit)
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jumlah Kredit</label>
              <input
                type="number"
                value={injectAmount}
                onChange={(e) => setInjectAmount(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono shadow-xs"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan Audit</label>
              <input
                type="text"
                value={injectNote}
                onChange={(e) => setInjectNote(e.target.value)}
                placeholder="Alasan penyesuaian saldo..."
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-xs"
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                disabled={injecting || !selectedOrgId}
                onClick={() => handleInjectCredit()}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-3 rounded-md transition shadow-xs disabled:opacity-50 text-center"
              >
                {injecting ? 'Memproses...' : 'Terapkan'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-slate-500">Preset Cepat:</span>
            {[50, 100, 250, 500].map((preset) => (
              <button
                key={preset}
                disabled={injecting || !selectedOrgId}
                onClick={() => {
                  setInjectAmount(preset)
                  handleInjectCredit(preset)
                }}
                className="text-[11px] font-mono text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded transition disabled:opacity-50"
              >
                +{preset}
              </button>
            ))}
          </div>
        </section>

        {/* Tenant Organizations Table */}
        <section className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Daftar Tenant Organisasi</h2>
              <p className="text-xs text-slate-500 mt-0.5">Seluruh ruang kerja dan dompet kredit terdaftar.</p>
            </div>
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau slug..."
                className="w-56 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold w-16">ID</th>
                  <th className="py-3 px-4 font-semibold">Nama Organisasi</th>
                  <th className="py-3 px-4 font-semibold">Slug Tenant</th>
                  <th className="py-3 px-4 font-semibold text-right">Saldo Dompet</th>
                  <th className="py-3 px-4 font-semibold text-center">Pengguna</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Tidak ada tenant yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">#{org.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{org.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{org.slug}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span
                          className={`font-bold ${
                            org.balance > 0 ? 'text-teal-700' : 'text-slate-400'
                          }`}
                        >
                          {org.balance}
                        </span>{' '}
                        <span className="text-slate-400 text-[11px]">kredit</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{org.userCount}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedOrgId(org.id)
                            setInjectAmount(100)
                            handleInjectCredit(100)
                          }}
                          className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded transition"
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

        {/* Audit Trail Panel */}
        <section className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Log Audit Transaksi Kredit Terkini</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              15 mutasi ledger terakhir di seluruh organisasi untuk pengawasan operasional.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold w-36">Waktu</th>
                  <th className="py-3 px-4 font-semibold">Organisasi</th>
                  <th className="py-3 px-4 font-semibold">Tipe Mutasi</th>
                  <th className="py-3 px-4 font-semibold text-right">Jumlah</th>
                  <th className="py-3 px-4 font-semibold text-right">Saldo Akhir</th>
                  <th className="py-3 px-4 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                {!data?.recentAuditLogs || data.recentAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Belum ada catatan mutasi transaksi kredit di ledger.
                    </td>
                  </tr>
                ) : (
                  data.recentAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {log.organizationName || `Org #${log.organizationId}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            BADGE_STYLES_BY_TRANSACTION_TYPE[log.type] || 'border-slate-200 bg-slate-100 text-slate-600'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                          log.amount > 0 ? 'text-teal-700' : log.amount < 0 ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        {log.amount > 0 ? `+${log.amount}` : log.amount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 font-medium">
                        {log.balanceAfter}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.description || ''}>
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
