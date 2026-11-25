import React, { useState } from 'react'
import type { AuthUser } from '../App'

interface AppNavbarProps {
  currentUser: AuthUser | null
  currentRoute: string
  onLogout: () => void
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ currentUser, currentRoute, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigateTo = (hash: string) => {
    setMobileMenuOpen(false)
    window.location.hash = hash
  }

  const renderSuperadminControl = (isMobile: boolean) => {
    if (currentUser?.role === 'superadmin' && currentRoute !== '#/superadmin') {
      return (
        <button
          type="button"
          onClick={() => navigateTo('#/superadmin')}
          className={
            isMobile
              ? 'w-full text-left px-3 py-2 text-xs font-semibold text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-control)] cursor-pointer flex items-center gap-2'
              : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold px-3.5 py-1.5 rounded-[var(--radius-control)] cursor-pointer flex items-center gap-1.5'
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)]" />
          Portal Superadmin
        </button>
      )
    }

    if (currentRoute === '#/superadmin') {
      return (
        <span
          className={
            isMobile
              ? 'px-3 py-1.5 text-[11px] font-mono font-semibold text-[var(--muted)] bg-[var(--raised)] border border-[var(--border)] rounded-[var(--radius-control)] uppercase tracking-wider'
              : 'text-[11px] font-mono font-semibold text-[var(--muted)] bg-[var(--raised)] border border-[var(--border)] px-2.5 py-1 rounded-[var(--radius-control)] uppercase tracking-wider'
          }
        >
          Mode Operator Konsol
        </span>
      )
    }

    return null
  }

  return (
    <nav
      aria-label="Navigasi Utama"
      className="bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-8 py-3"
    >
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-3">
        {/* Left Branding & Home Link */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/'
            }}
            className="hidden sm:flex items-center gap-1.5 bg-transparent border-0 text-[13px] font-medium text-[var(--muted)] cursor-pointer p-0 shrink-0 hover:text-[var(--text)]"
          >
            ← Beranda SaaS
          </button>
          <span className="hidden sm:inline-block h-3.5 w-px bg-[var(--border)] shrink-0" />
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base font-bold tracking-tight text-[var(--text)] shrink-0">
              TalentHub
            </span>
            <span className="hidden md:inline-block text-[11px] font-mono bg-[var(--pill-neutral-bg)] text-[var(--pill-neutral-ink)] px-2 py-0.5 rounded border border-[var(--border)] shrink-0">
              v2.4 · Cloudflare Native
            </span>
          </div>
        </div>

        {/* Desktop Right Actions & Session Info */}
        <div className="hidden md:flex items-center gap-4">
          {renderSuperadminControl(false)}

          {currentUser && (
            <span className="text-[13px] text-[var(--muted)]">
              Halo, <strong className="text-[var(--text)]">{currentUser.name}</strong>
            </span>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-control)] cursor-pointer"
          >
            Keluar
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          aria-expanded={mobileMenuOpen}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] cursor-pointer"
        >
          {mobileMenuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-[var(--border)] flex flex-col gap-2.5">
          {currentUser && (
            <div className="text-xs text-[var(--muted)] px-1">
              Masuk sebagai <strong className="text-[var(--text)]">{currentUser.name}</strong>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false)
              window.location.hash = '#/'
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--text)] bg-[var(--raised)] border border-[var(--border)] rounded-[var(--radius-control)] cursor-pointer"
          >
            ← Beranda SaaS
          </button>

          {renderSuperadminControl(true)}

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false)
              onLogout()
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--negative)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-control)] cursor-pointer"
          >
            Keluar
          </button>
        </div>
      )}
    </nav>
  )
}
