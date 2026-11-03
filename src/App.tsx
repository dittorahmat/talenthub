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
      .then((data) => {
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
          background: '#0F172A',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            background: '#1E293B',
            padding: '32px',
            borderRadius: '16px',
            border: '1px solid #334155',
            maxWidth: '440px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Akses Dibatasi</h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0 0 24px', lineHeight: 1.5 }}>
              Halaman ini hanya dapat diakses oleh akun dengan peran <strong>superadmin</strong>. Silakan masuk terlebih dahulu dengan kredensial superadmin.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { window.location.hash = '#/login' }}
                style={{
                  background: '#0D9488',
                  color: 'white',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Masuk via Login
              </button>
              <button
                onClick={() => { window.location.hash = '#/' }}
                style={{
                  background: '#334155',
                  color: '#CBD5E1',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
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
        <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '10px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#/'
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ← Beranda SaaS
              </button>
              <span style={{ height: '14px', width: '1px', background: '#CBD5E1' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>TalentHub</span>
                <span style={{ fontSize: '11px', background: '#CCFBF1', color: '#0F766E', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  Talent Intelligence
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {currentUser?.role === 'superadmin' && (
                <button
                  onClick={() => {
                    window.location.hash = '#/superadmin'
                  }}
                  style={{
                    background: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    color: '#4338CA',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🛡️ Superadmin Panel
                </button>
              )}

              {currentUser && (
                <span style={{ fontSize: '13px', color: '#334155' }}>
                  Halo, <strong>{currentUser.name}</strong> ({currentUser.role})
                </span>
              )}

              <button
                onClick={handleLogout}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '12px',
                  padding: '5px 12px',
                  borderRadius: '6px',
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
