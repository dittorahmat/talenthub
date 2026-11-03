import React, { useState, useEffect } from 'react'
import { JobsDashboard } from './pages/JobsDashboard'
import { KanbanBoard } from './pages/KanbanBoard'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SuperadminPortal } from './pages/SuperadminPortal'

export type AppRoute = '#/' | '#/login' | '#/register' | '#/superadmin' | '#/workspace' | '#/dashboard' | '#/jobs'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'recruiter'
  organizationId: number | null
  organization?: {
    id: number
    name: string
    slug: string
  } | null
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => (window.location.hash as AppRoute) || '#/')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState<boolean>(false)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)

  // Listen to hash route changes
  useEffect(() => {
    const handleHashChange = () => {
      setRoute((window.location.hash as AppRoute) || '#/')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/auth/get-session')
      .then((res) => {
        if (res.ok) return res.json()
        return null
      })
      .then((data: any) => {
        if (data?.data?.user) {
          setCurrentUser(data.data.user)
        }
      })
      .catch(() => {})
      .finally(() => {
        setAuthChecked(true)
      })
  }, [])

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user)
    if (user.role === 'superadmin') {
      window.location.hash = '#/superadmin'
    } else {
      window.location.hash = '#/workspace'
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' })
    } catch {}
    setCurrentUser(null)
    window.location.hash = '#/'
  }

  // Route Dispatcher
  if (route === '#/login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  if (route === '#/register') {
    return (
      <RegisterPage
        onSuccess={() => {
          window.location.hash = '#/workspace'
        }}
      />
    )
  }

  // Superadmin Guard: verify role
  if (route === '#/superadmin') {
    if (!authChecked) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Memeriksa otentikasi...</div>
    }

    if (!currentUser || currentUser.role !== 'superadmin') {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--ground)',
          color: 'var(--text)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'var(--font-sans)'
        }}>
          <div style={{
            background: 'var(--surface)',
            padding: '40px',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border)',
            maxWidth: '460px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              display: 'inline-flex',
              padding: '6px 12px',
              borderRadius: 'var(--radius-control)',
              background: 'var(--raised)',
              border: '1px solid var(--border)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--muted)',
              marginBottom: '16px'
            }}>
              Autentikasi Terbatas
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Akses Khusus Superadmin
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
              Halaman ini hanya dapat diakses oleh akun dengan peran <strong>superadmin</strong> resmi. Silakan masuk terlebih dahulu dengan kredensial yang sesuai.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => { window.location.hash = '#/login' }}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-control)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Masuk via Login
              </button>
              <button
                type="button"
                onClick={() => { window.location.hash = '#/' }}
                style={{
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-control)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Ke Beranda
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <SuperadminPortal
        onBackToApp={() => {
          window.location.hash = '#/workspace'
        }}
      />
    )
  }

  if (route === '#/workspace' || route === '#/dashboard' || route === '#/jobs') {
    return (
      <div>
        {/* Workspace Top Navigation Bar */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 32px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>TalentHub</span>
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--pill-neutral-bg)',
                  color: 'var(--pill-neutral-ink)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}>
                  v2.4 · Cloudflare Native
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {currentUser?.role === 'superadmin' && (
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

              {currentUser && (
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  Halo, <strong style={{ color: 'var(--text)' }}>{currentUser.name}</strong>
                </span>
              )}

              <button
                type="button"
                onClick={handleLogout}
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
        </div>

        {/* Talent Intelligence Workspace Content */}
        {selectedJobId === null ? (
          <JobsDashboard onSelectJob={(id) => setSelectedJobId(id)} />
        ) : (
          <KanbanBoard jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />
        )}
      </div>
    )
  }

  // Default: Public SaaS Landing Page
  return <LandingPage />
}
