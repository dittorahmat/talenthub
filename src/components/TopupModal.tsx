import React, { useState, useEffect } from 'react'
import { orgFetch } from '../context/OrgContext'

export interface CreditPackage {
  id: 'starter' | 'growth' | 'enterprise'
  name: string
  credits: number
  priceIdr: number
  unitPriceIdr: number
  tag?: string
  description: string
  features: string[]
}

export interface InvoiceData {
  id: string
  organizationId: number
  packageId: string
  packageName: string
  credits: number
  amountIdr: number
  paymentMethod: string
  paymentCode: string
  status: string
  expiresAt: string
}

interface TopupModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  onPaymentSuccess: (newBalance: number) => void
}

export const TopupModal: React.FC<TopupModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onPaymentSuccess,
}) => {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<string>('growth')
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va_bca' | 'va_mandiri'>('qris')
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [simulating, setSimulating] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [successInfo, setSuccessInfo] = useState<{ credits: number; newBalance: number } | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setInvoice(null)
      setSuccessInfo(null)
      setCopied(false)
      return
    }

    const fetchPackages = async () => {
      try {
        const res = await orgFetch('/api/billing/packages')
        if (res.ok) {
          const data = (await res.json() as any)
          setPackages(data.packages || [])
        }
      } catch (err) {
        console.error('Failed to load packages:', err)
      }
    }
    fetchPackages()
  }, [isOpen])

  if (!isOpen) return null

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await orgFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackageId,
          paymentMethod,
        }),
      })

      if (res.ok) {
        const data = (await res.json() as any)
        setInvoice(data.invoice)
      } else {
        const errData = (await res.json() as any).catch(() => ({}))
        alert(errData.error || 'Gagal membuat tagihan pembayaran')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Terjadi kesalahan saat memproses checkout.')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulatePayment = async () => {
    if (!invoice) return
    setSimulating(true)
    try {
      const res = await orgFetch(`/api/billing/simulate-pay/${invoice.id}`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = (await res.json() as any)
        setSuccessInfo({
          credits: data.creditsAdded || invoice.credits,
          newBalance: data.balance,
        })
        onPaymentSuccess(data.balance)
        window.dispatchEvent(new CustomEvent('walletChanged'))
      } else {
        const err = (await res.json() as any).catch(() => ({}))
        alert(err.error || 'Simulasi pembayaran gagal')
      }
    } catch (err) {
      console.error('Simulate payment error:', err)
      alert('Koneksi terputus saat simulasi pembayaran')
    } finally {
      setSimulating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatIdr = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          width: '100%',
          maxWidth: invoice ? '480px' : '760px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(13, 148, 136, 0.2)',
                border: '1px solid rgba(13, 148, 136, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              💳
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                {successInfo ? 'Pembayaran Berhasil' : invoice ? 'Selesaikan Pembayaran' : 'Top Up Kredit AI Screening'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                Saldo saat ini:{' '}
                <strong style={{ color: '#2DD4BF' }}>
                  {successInfo ? successInfo.newBalance : currentBalance} Kredit
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#CBD5E1',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* SUCCESS SCREEN */}
          {successInfo ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  margin: '0 auto 16px',
                  boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.2)',
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                Top Up Berhasil Diselesaikan!
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748B' }}>
                Selamat! <strong>+{successInfo.credits} Kredit</strong> telah ditambahkan ke dompet organisasi Anda.
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'inline-block',
                  minWidth: '240px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#64748B' }}>Saldo Dompet Baru:</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0D9488', marginTop: '4px' }}>
                  ⚡ {successInfo.newBalance} Kredit
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 28px',
                    background: '#0D9488',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          ) : invoice ? (
            /* INVOICE & PAYMENT VIEW */
            <div>
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>No. Invoice</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{invoice.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Paket</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
                    {invoice.packageName} (+{invoice.credits} Kredit)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Total Bayar</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0D9488' }}>
                    {formatIdr(invoice.amountIdr)}
                  </span>
                </div>
              </div>

              {invoice.paymentMethod === 'qris' ? (
                /* QRIS DISPLAY */
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>
                    Scan QRIS dengan GoPay, OVO, Dana, BCA, atau Livin'
                  </div>
                  <div
                    style={{
                      width: '200px',
                      height: '200px',
                      margin: '0 auto 12px',
                      background: 'white',
                      border: '2px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                      <rect width="100" height="100" fill="white" />
                      {/* Stylized QR Code Mock */}
                      <rect x="10" y="10" width="25" height="25" fill="#0F172A" />
                      <rect x="15" y="15" width="15" height="15" fill="white" />
                      <rect x="18" y="18" width="9" height="9" fill="#0F172A" />
                      
                      <rect x="65" y="10" width="25" height="25" fill="#0F172A" />
                      <rect x="70" y="15" width="15" height="15" fill="white" />
                      <rect x="73" y="18" width="9" height="9" fill="#0F172A" />

                      <rect x="10" y="65" width="25" height="25" fill="#0F172A" />
                      <rect x="15" y="70" width="15" height="15" fill="white" />
                      <rect x="18" y="73" width="9" height="9" fill="#0F172A" />

                      <rect x="42" y="15" width="6" height="6" fill="#0F172A" />
                      <rect x="52" y="20" width="6" height="6" fill="#0D9488" />
                      <rect x="42" y="30" width="16" height="6" fill="#0F172A" />
                      <rect x="42" y="45" width="16" height="16" fill="#0F172A" />
                      <rect x="65" y="45" width="8" height="8" fill="#0D9488" />
                      <rect x="78" y="55" width="12" height="12" fill="#0F172A" />
                      <rect x="42" y="68" width="8" height="22" fill="#0F172A" />
                      <rect x="55" y="75" width="10" height="15" fill="#0D9488" />
                      <rect x="70" y="72" width="20" height="18" fill="#0F172A" />
                    </svg>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', marginTop: '4px' }}>
                      NMID: ID10200392019
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Kedaluwarsa dalam 24 jam. Otomatis terverifikasi setelah dibayar.
                  </div>
                </div>
              ) : (
                /* VIRTUAL ACCOUNT DISPLAY */
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
                    Nomor Virtual Account {invoice.paymentMethod === 'va_bca' ? 'BCA' : 'Mandiri'}:
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: '#F1F5F9',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      margin: '0 auto 12px',
                      maxWidth: '300px',
                    }}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px', color: '#0F172A' }}>
                      {invoice.paymentCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(invoice.paymentCode)}
                      style={{
                        background: '#0D9488',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? 'Tersalin!' : 'Salin'}
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Transfer sesuai nominal ke nomor Virtual Account di atas.
                  </div>
                </div>
              )}

              {/* SIMULATE INSTANT PAYMENT (DEMO & TEST TESTING) */}
              <div
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>
                    Mode Sandbox & Demo
                  </div>
                  <div style={{ fontSize: '11px', color: '#3B82F6' }}>
                    Klik tombol untuk menyimulasikan webhook pembayaran sukses seketika.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  style={{
                    background: '#2563EB',
                    color: 'white',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: simulating ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {simulating ? 'Menyelesaikan...' : '⚡ Simulasi Bayar Instan'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setInvoice(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'white',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Pilih Paket Lain
                </button>
              </div>
            </div>
          ) : (
            /* PACKAGE SELECTION & PAYMENT METHOD SELECTION */
            <div>
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#475569' }}>
                Pilih paket kredit untuk screening CV otomatis, ranking talent AI, dan automasi rekrutmen:
              </p>

              {/* Package Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: packages.length > 0 ? `repeat(${packages.length}, 1fr)` : 'repeat(3, 1fr)',
                  gap: '14px',
                  marginBottom: '24px',
                }}
              >
                {(packages.length > 0 ? packages : [
                  { id: 'starter', name: 'Starter', credits: 100, priceIdr: 250000, unitPriceIdr: 2500, features: ['100 Kredit Screening AI'] },
                  { id: 'growth', name: 'Growth', credits: 500, priceIdr: 1000000, unitPriceIdr: 2000, tag: 'Paling Populer', features: ['500 Kredit Screening AI', 'Hemat 20%'] },
                  { id: 'enterprise', name: 'Enterprise', credits: 2500, priceIdr: 3750000, unitPriceIdr: 1500, tag: 'Nilai Terbaik', features: ['2.500 Kredit Screening AI', 'Hemat 40%'] },
                ]).map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      style={{
                        border: isSelected ? '2px solid #0D9488' : '1px solid #E2E8F0',
                        background: isSelected ? '#F0FDFA' : 'white',
                        borderRadius: '14px',
                        padding: '16px 14px',
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 10px 15px -3px rgba(13, 148, 136, 0.15)' : 'none',
                      }}
                    >
                      {pkg.tag && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: pkg.id === 'growth' ? '#0D9488' : '#6366F1',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {pkg.tag}
                        </span>
                      )}

                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{pkg.name}</div>
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>⚡ {pkg.credits}</span>
                        <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '4px' }}>Kredit</span>
                      </div>

                      <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 700, color: '#0D9488' }}>
                        {formatIdr(pkg.priceIdr)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {formatIdr(pkg.unitPriceIdr)} / kredit
                      </div>

                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', flex: 1 }}>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#475569' }}>
                          {pkg.features?.map((f, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Payment Method Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Metode Pembayaran
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'qris', label: 'QRIS', icon: '📱', desc: 'Instan semua e-wallet' },
                    { id: 'va_bca', label: 'BCA Virtual Account', icon: '🏦', desc: 'BCA Mobile / KlikBCA' },
                    { id: 'va_mandiri', label: 'Mandiri Virtual Account', icon: '🏛️', desc: 'Livin by Mandiri' },
                  ].map((m) => {
                    const isSelected = paymentMethod === m.id
                    return (
                      <div
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id as any)}
                        style={{
                          border: isSelected ? '2px solid #0D9488' : '1px solid #CBD5E1',
                          background: isSelected ? '#F0FDFA' : '#FAFAFA',
                          borderRadius: '10px',
                          padding: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{m.icon}</span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{m.label}</div>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>{m.desc}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Submit Checkout Button */}
              <button
                type="button"
                disabled={loading}
                onClick={handleCheckout}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#94A3B8' : '#0D9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.3)',
                }}
              >
                {loading ? 'Menyiapkan Pembayaran...' : 'Lanjutkan ke Pembayaran →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
