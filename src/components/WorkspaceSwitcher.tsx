import React, { useState, useRef, useEffect } from 'react'
import { useOrg } from '../context/OrgContext'
import { TrialOnboardingModal } from './TrialOnboardingModal'

export const WorkspaceSwitcher: React.FC = () => {
  const { currentOrg, organizations, setOrganizationId } = useOrg()
  const [isOpen, setIsOpen] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-control)',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text)',
          cursor: 'pointer',
        }}
        title="Switch Organization Workspace"
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            borderRadius: '4px',
            background: 'var(--raised)',
            color: 'var(--text)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            border: '1px solid var(--border)',
          }}
        >
          {currentOrg.name.charAt(0).toUpperCase()}
        </span>
        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentOrg.name}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--muted)' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: '260px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-card)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 12px', background: 'var(--raised)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Workspaces ({organizations.length})
            </span>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {organizations.map((org) => {
              const isSelected = org.id === currentOrg.id
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    setOrganizationId(org.id)
                    setIsOpen(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: 'none',
                    background: isSelected ? 'var(--raised)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    color: 'var(--text)',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {org.name}
                  </span>
                  {isSelected && (
                    <span style={{ color: 'var(--positive)', fontSize: '12px' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setShowOnboardingModal(true)
              }}
              style={{
                width: '100%',
                padding: '6px',
                background: 'var(--raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              + Create New Workspace
            </button>
          </div>
        </div>
      )}

      <TrialOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onSuccess={(newOrgId) => {
          if (newOrgId) {
            setOrganizationId(newOrgId)
          }
          setShowOnboardingModal(false)
        }}
      />
    </div>
  )
}
