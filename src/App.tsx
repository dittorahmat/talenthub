import React, { useState, useEffect } from 'react'
import { JobsDashboard } from './pages/JobsDashboard'
import { KanbanBoard } from './pages/KanbanBoard'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SuperadminPortal } from './pages/SuperadminPortal'

export default function App() {
  const [route, setRoute] = useState<string>(() => window.location.hash || '#/')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)

  // Listen to hash route changes
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/')
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
  }, [])

  const handleLoginSuccess = (user: any) => {
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

  // Router Dispatcher
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

  if (route === '#/superadmin') {
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
