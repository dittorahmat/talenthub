import React from 'react'
import type { AuthUser } from '../App'

interface AppNavbarProps {
  currentUser: AuthUser | null
  currentRoute: string
  onLogout: () => void
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ currentUser, currentRoute, onLogout }) => {
  return (
    <nav
      aria-label="Navigasi Utama"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 32px'
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Left Branding & Home Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/'
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0
            }}
          >
            ← Beranda SaaS
          </button>
          <span style={{ height: '14px', width: '1px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>
              TalentHub
            </span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                background: 'var(--pill-neutral-bg)',
                color: 'var(--pill-neutral-ink)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border)'
              }}
            >
              v2.4 · Cloudflare Native
            </span>
          </div>
        </div>

        {/* Right Actions & Session Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Superadmin shortcut (only shown in workspace/dashboard when user has superadmin role) */}
          {currentUser?.role === 'superadmin' && currentRoute !== '#/superadmin' && (
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/superadmin'
              }}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 'var(--radius-control)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--positive)' }} />
              Portal Superadmin
            </button>
          )}

          {/* Superadmin active page indicator badge */}
          {currentRoute === '#/superadmin' && (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: 'var(--muted)',
                background: 'var(--raised)',
                border: '1px solid var(--border)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-control)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              Mode Operator Konsol
            </span>
          )}

          {currentUser && (
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Halo, <strong style={{ color: 'var(--text)' }}>{currentUser.name}</strong>
            </span>
          )}

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '12px',
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 'var(--radius-control)',
              cursor: 'pointer'
            }}
          >
            Keluar
          </button>
        </div>
      </div>
    </nav>
  )
}
