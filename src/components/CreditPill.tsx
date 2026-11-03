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
        const data = (await res.json() as any)
        setBalance(data.balance ?? 0)
        setTransactions(data.transactions ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch wallet info:', err)
    } finally {
      setLoading(false)
    }
  }

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

  const isLowBalance = (balance ?? 0) < 10

  return (
    <>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-control)',
          padding: '4px 10px',
          fontSize: '12px',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
          title="Click to view transaction ledger history"
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isLowBalance ? 'var(--negative)' : 'var(--positive)',
          }} />
          <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Credits
          </span>
          <span className="tabular-numbers" style={{
            fontWeight: 700,
            color: isLowBalance ? 'var(--negative)' : 'var(--text)',
          }}>
            {loading ? '...' : (balance ?? 0).toLocaleString()}
          </span>
        </button>

        <span style={{ color: 'var(--border)' }}>|</span>

        <button
          type="button"
          onClick={() => setIsTopupModalOpen(true)}
          style={{
            background: 'var(--raised)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          Top Up
        </button>
      </div>

      <CreditHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        balance={balance ?? 0}
        transactions={transactions}
        onTopUp={handleTopUp}
        onOpenTopupModal={() => {
          setIsModalOpen(false)
          setIsTopupModalOpen(true)
        }}
        isToppingUp={isToppingUp}
      />

      <TopupModal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        currentBalance={balance ?? 0}
        onPaymentSuccess={(newBalance) => {
          setBalance(newBalance)
          fetchWallet()
          window.dispatchEvent(new CustomEvent('walletChanged'))
        }}
      />
    </>
  )
}
