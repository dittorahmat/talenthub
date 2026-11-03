import React, { useState } from 'react'

export interface CreditTransaction {
  id: number
  amount: number
  type: string
  description: string | null
  balanceAfter: number
  createdAt: string
}

interface CreditHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
  transactions: CreditTransaction[]
  onTopUp: (amount: number) => Promise<void>
  onOpenTopupModal?: () => void
  isToppingUp?: boolean
}

export const CreditHistoryModal: React.FC<CreditHistoryModalProps> = ({
  isOpen,
  onClose,
  balance,
  transactions,
  onTopUp,
  onOpenTopupModal,
  isToppingUp = false,
}) => {
  const [selectedTopUp, setSelectedTopUp] = useState<number>(100)
  const [activeTab, setActiveTab] = useState<'history' | 'topup'>('history')

  if (!isOpen) return null

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return isoString
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'INITIAL_GRANT':
        return <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Grant Awal</span>
      case 'PURCHASE':
        return <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Top Up</span>
      case 'CV_SCREENING':
        return <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Screening CV</span>
      case 'REFUND':
        return <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Refund</span>
      default:
        return <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{type}</span>
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
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
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
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
            background: '#F8FAFC',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                Dompet Kredit Workspace
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
              Saldo aktif: <strong style={{ color: '#0D9488', fontSize: '15px' }}>{balance} Kredit</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', background: 'white' }}>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid #0D9488' : '2px solid transparent',
              background: 'none',
              fontWeight: activeTab === 'history' ? 700 : 500,
              color: activeTab === 'history' ? '#0D9488' : '#64748B',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Riwayat Transaksi ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('topup')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'topup' ? '2px solid #0D9488' : '2px solid transparent',
              background: 'none',
              fontWeight: activeTab === 'topup' ? 700 : 500,
              color: activeTab === 'topup' ? '#0D9488' : '#64748B',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            + Beli / Top Up Kredit
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeTab === 'history' ? (
            <div>
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94A3B8' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>Belum ada riwayat transaksi kredit.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #F1F5F9',
                        background: '#FAFAFA',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          {getTypeBadge(tx.type)}
                          <span style={{ fontSize: '12px', color: '#64748B' }}>{formatDate(tx.createdAt)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>
                          {tx.description || tx.type}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                          Saldo akhir: {tx.balanceAfter} kredit
                        </p>
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '15px',
                          color: tx.amount > 0 ? '#16A34A' : '#DC2626',
                          whiteSpace: 'nowrap',
                          paddingLeft: '12px',
                        }}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
                Pilih paket kredit untuk screening CV otomatis dan AI Talent Intelligence:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { id: 'starter', credits: 100, price: 'Rp 250.000', popular: false },
                  { id: 'growth', credits: 500, price: 'Rp 1.000.000', popular: true },
                  { id: 'enterprise', credits: 2500, price: 'Rp 3.750.000', popular: false },
                ].map((pkg) => (
                  <div
                    key={pkg.credits}
                    onClick={() => {
                      setSelectedTopUp(pkg.credits)
                      if (onOpenTopupModal) {
                        onClose()
                        onOpenTopupModal()
                      }
                    }}
                    style={{
                      border: selectedTopUp === pkg.credits ? '2px solid #0D9488' : '1px solid #E2E8F0',
                      background: selectedTopUp === pkg.credits ? '#F0FDFA' : 'white',
                      borderRadius: '12px',
                      padding: '14px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {pkg.popular && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-9px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#0D9488',
                          color: 'white',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Paling Populer
                      </span>
                    )}
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                      ⚡ {pkg.credits}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Kredit</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0D9488', marginTop: '8px' }}>
                      {pkg.price}
                    </div>
                  </div>
                ))}
              </div>

              {onOpenTopupModal ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenTopupModal()
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#0D9488',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
                  }}
                >
                  💳 Buka Kasir Pembayaran (QRIS / VA) →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isToppingUp}
                  onClick={async () => {
                    await onTopUp(selectedTopUp)
                    setActiveTab('history')
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: isToppingUp ? '#94A3B8' : '#0D9488',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isToppingUp ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
                  }}
                >
                  {isToppingUp ? 'Memproses...' : `Konfirmasi Top Up ⚡ ${selectedTopUp} Kredit`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
