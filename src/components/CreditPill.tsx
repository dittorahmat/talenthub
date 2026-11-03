import React, { useState, useEffect } from 'react'
import { orgFetch, useOrg } from '../context/OrgContext'
import { CreditHistoryModal, CreditTransaction } from './CreditHistoryModal'
import { TopupModal } from './TopupModal'

export const CreditPill: React.FC = () => {
  const { currentOrg } = useOrg()
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isTopupModalOpen, setIsTopupModalOpen] = useState<boolean>(false)
  const [isToppingUp, setIsToppingUp] = useState<boolean>(false)

  const fetchWallet = async () => {
    try {
      setLoading(true)
      const res = await orgFetch('/api/wallet')
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance ?? 0)
        setTransactions(data.transactions ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch wallet info:', err)
    } finally {
      setLoading(false)
    }
  }

  // Refresh when organization changes or when custom event fires
  useEffect(() => {
    fetchWallet()

    const handleOrgChange = () => fetchWallet()
    const handleWalletRefresh = () => fetchWallet()

    window.addEventListener('organizationChanged', handleOrgChange)
    window.addEventListener('walletChanged', handleWalletRefresh)

    return () => {
      window.removeEventListener('organizationChanged', handleOrgChange)
      window.removeEventListener('walletChanged', handleWalletRefresh)
    }
  }, [currentOrg.id])

  const handleTopUp = async (amount: number) => {
    try {
      setIsToppingUp(true)
      const res = await orgFetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (res.ok) {
        await fetchWallet()
        window.dispatchEvent(new CustomEvent('walletChanged'))
      }
    } catch (err) {
      console.error('Top up error:', err)
    } finally {
      setIsToppingUp(false)
    }
  }

  const isLowBalance = (balance ?? 0) < 10

  return (
    <>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: isLowBalance ? '#FEF2F2' : '#F0FDFA',
          border: `1px solid ${isLowBalance ? '#FECACA' : '#CCFBF1'}`,
          borderRadius: '8px',
          padding: '4px 8px 4px 10px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.15s ease',
        }}
      >
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          title="Klik untuk melihat riwayat kredit atau top up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            color: isLowBalance ? '#DC2626' : '#0F766E',
          }}
        >
          <span style={{ fontSize: '14px' }}>⚡</span>
          <span>
            {loading && balance === null ? '...' : `${balance ?? 0} Kredit`}
          </span>
        </button>

        <div style={{ width: '1px', height: '14px', background: isLowBalance ? '#FCA5A5' : '#99F6E4' }} />

        <button
          type="button"
          onClick={() => setIsTopupModalOpen(true)}
          style={{
            background: isLowBalance ? '#DC2626' : '#0D9488',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            lineHeight: '1.2',
          }}
          title="Beli paket kredit"
        >
          + Top Up
        </button>
      </div>

      <CreditHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        balance={balance ?? 0}
        transactions={transactions}
        onTopUp={handleTopUp}
        onOpenTopupModal={() => setIsTopupModalOpen(true)}
        isToppingUp={isToppingUp}
      />

      <TopupModal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        currentBalance={balance ?? 0}
        onPaymentSuccess={async (newBal) => {
          setBalance(newBal)
          await fetchWallet()
        }}
      />
    </>
  )
}
