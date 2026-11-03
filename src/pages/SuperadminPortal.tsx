import React, { useState, useEffect } from 'react'

interface SuperadminPortalProps {
  onBackToApp: () => void
}

export function SuperadminPortal({ onBackToApp }: SuperadminPortalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [injectAmount, setInjectAmount] = useState<number>(100)
  const [injectNote, setInjectNote] = useState<string>('Developer testing credit injection')
  const [injectStatus, setInjectStatus] = useState<string | null>(null)
  const [injecting, setInjecting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/superadmin/overview', {
        headers: { 'X-Superadmin-Key': 'dev-bypass' }
      })
      if (!res.ok) throw new Error('Failed to load superadmin overview')
      const json: any = await res.json()
      setData(json)
      if (json.organizations?.length > 0 && selectedOrgId === null) {
        setSelectedOrgId(json.organizations[0].id)
      }
    } catch (err: any) {
      setError(err.message)
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
          note: injectNote || `Quick inject +${amt} credits by Superadmin`
        })
      })

      const result: any = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to inject credit')

      setInjectStatus(`✅ Berhasil menambahkan +${amt} kredit ke Org ID: ${selectedOrgId}`)
      await fetchData()
    } catch (err: any) {
      setInjectStatus(`❌ Gagal: ${err.message}`)
    } finally {
      setInjecting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header Bar */}
      <header style={{
        background: '#1E293B',
        borderBottom: '1px solid #334155',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Superadmin Testing Portal</h1>
              <span style={{ fontSize: '11px', background: '#4338CA', color: '#E0E7FF', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                DEV MODE
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
              Multi-Tenant Inspector & Instant Credit Bypass for Developers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchData}
            style={{
              background: '#334155',
              color: '#F8FAFC',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={onBackToApp}
            style={{
              background: '#0D9488',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Masuk ke Workspace Aplikasi →
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {loading && <div style={{ color: '#94A3B8' }}>Memuat data superadmin...</div>}
        {error && <div style={{ color: '#F87171', background: '#450A0A', padding: '12px', borderRadius: '8px' }}>{error}</div>}

        {data && (
          <div>
            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Total Tenants</div>
                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: '#38BDF8' }}>{data.totalTenants}</div>
              </div>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Total Users (Better Auth)</div>
                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: '#A78BFA' }}>{data.totalUsers}</div>
              </div>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Recent Batch Queues</div>
                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: '#34D399' }}>{data.recentBatches?.length || 0}</div>
              </div>
            </div>

            {/* Instant Credit Injection Card */}
            <div style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '32px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#F8FAFC' }}>
                ⚡ Instant Credit Injection (Testing Bypass)
              </h2>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 20px' }}>
                Tambahkan saldo kredit langsung ke dompet tenant tanpa perlu simulasi QRIS/Virtual Account Midtrans.
              </p>

              {injectStatus && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: injectStatus.startsWith('✅') ? '#064E3B' : '#7F1D1D',
                  color: 'white',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}>
                  {injectStatus}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Target Organization</label>
                  <select
                    value={selectedOrgId || ''}
                    onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid #475569',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    {data.organizations.map((org: any) => (
                      <option key={org.id} value={org.id}>
                        {org.name} (Saldo: {org.balance} Kredit)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '0 1 140px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Jumlah Kredit</label>
                  <input
                    type="number"
                    value={injectAmount}
                    onChange={(e) => setInjectAmount(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid #475569',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ flex: '1 1 240px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Audit Note</label>
                  <input
                    type="text"
                    value={injectNote}
                    onChange={(e) => setInjectNote(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid #475569',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '22px' }}>
                  <button
                    disabled={injecting}
                    onClick={() => handleInjectCredit()}
                    style={{
                      background: '#0D9488',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: injecting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {injecting ? 'Injecting...' : 'Inject Custom'}
                  </button>
                  <button
                    disabled={injecting}
                    onClick={() => handleInjectCredit(100)}
                    style={{
                      background: '#334155',
                      color: '#F8FAFC',
                      border: '1px solid #475569',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    +100 Quick
                  </button>
                  <button
                    disabled={injecting}
                    onClick={() => handleInjectCredit(500)}
                    style={{
                      background: '#334155',
                      color: '#F8FAFC',
                      border: '1px solid #475569',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    +500 Quick
                  </button>
                </div>
              </div>
            </div>

            {/* Organizations Table */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: '#F8FAFC' }}>
                🏢 Tenant Organizations Overview
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>ID</th>
                    <th style={{ padding: '12px 16px' }}>Nama Organisasi</th>
                    <th style={{ padding: '12px 16px' }}>Slug Tenant</th>
                    <th style={{ padding: '12px 16px' }}>Saldo Dompet</th>
                    <th style={{ padding: '12px 16px' }}>Anggota Tim</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.organizations.map((org: any) => (
                    <tr key={org.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '14px 16px', color: '#94A3B8' }}>#{org.id}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{org.name}</td>
                      <td style={{ padding: '14px 16px', color: '#CBD5E1', fontFamily: 'monospace' }}>{org.slug}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: org.balance > 0 ? '#064E3B' : '#7F1D1D',
                          color: org.balance > 0 ? '#6EE7B7' : '#FCA5A5',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '13px'
                        }}>
                          ⚡ {org.balance} Kredit
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94A3B8' }}>{org.userCount} users</td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => {
                            setSelectedOrgId(org.id)
                            handleInjectCredit(100)
                          }}
                          style={{
                            background: '#0284C7',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          +100 Kredit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
