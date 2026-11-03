import React, { useState, useRef, useEffect } from 'react'
import { useOrg } from '../context/OrgContext'

export const WorkspaceSwitcher: React.FC = () => {
  const { currentOrg, organizations, setOrganizationId } = useOrg()
  const [isOpen, setIsOpen] = useState(false)
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
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#1E293B',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.15s ease',
        }}
        title="Beralih Workspace Organisasi"
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: '#E0F2FE',
            color: '#0369A1',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {currentOrg.name.charAt(0).toUpperCase()}
        </span>
        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentOrg.name}
        </span>
        <span style={{ fontSize: '10px', color: '#64748B' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: '230px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E2E8F0',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pilih Organisasi (Workspace)
            </span>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '4px 0' }}>
            {organizations.map((org) => {
              const isActive = org.id === currentOrg.id
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
                    background: isActive ? '#F0FDF4' : 'transparent',
                    color: isActive ? '#166534' : '#1E293B',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        background: isActive ? '#DCFCE7' : '#F1F5F9',
                        color: isActive ? '#15803D' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                    <span>{org.name}</span>
                  </div>
                  {isActive && <span style={{ color: '#16A34A', fontSize: '13px' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
