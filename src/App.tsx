import React, { useState, useEffect } from 'react'
import { JobsDashboard } from './pages/JobsDashboard'
import { KanbanBoard } from './pages/KanbanBoard'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SuperadminPortal } from './pages/SuperadminPortal'
import { PublicCareerPage } from './pages/PublicCareerPage'
import { AppNavbar } from './components/AppNavbar'

export type AppRoute = '#/' | '#/login' | '#/register' | '#/superadmin' | '#/workspace' | '#/dashboard' | '#/jobs' | string

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

export interface ParsedRoute {
  raw: string
  path: string
  jobId: number | null
}

export function parseRoute(hash: string): ParsedRoute {
  const raw = hash || '#/'
  const [pathPart, queryPart] = raw.split('?')
  let jobId: number | null = null

  if (queryPart) {
    const params = new URLSearchParams(queryPart)
    const idParam = params.get('id')
    if (idParam && /^\d+$/.test(idParam)) {
      jobId = parseInt(idParam, 10)
    }
  }

  const jobPathMatch = pathPart.match(/^#\/jobs\/(\d+)$/)
  if (jobPathMatch) {
    jobId = parseInt(jobPathMatch[1], 10)
  }

  return {
    raw,
    path: pathPart,
    jobId,
  }
}

export default function App() {
  const [currentParsedRoute, setCurrentParsedRoute] = useState<ParsedRoute>(() => parseRoute(window.location.hash))
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState<boolean>(false)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(() => parseRoute(window.location.hash).jobId)

  // Listen to hash route changes
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseRoute(window.location.hash)
      setCurrentParsedRoute(parsed)
      // If URL has specific job ID, activate it.
      // If navigating to root workspace/dashboard or bare #/jobs without ID, reset job context.
      if (parsed.jobId !== null) {
        setSelectedJobId(parsed.jobId)
      } else if (
        parsed.path === '#/workspace' ||
        parsed.path === '#/dashboard' ||
        parsed.path === '#/jobs'
      ) {
        setSelectedJobId(null)
      }
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
    try {
      localStorage.removeItem('talenthub_active_org_id')
    } catch {}
    setCurrentUser(null)
    window.location.hash = '#/'
  }

  const currentRoute = currentParsedRoute.path

  // Route Dispatcher
  if (currentRoute === '#/login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  if (currentRoute === '#/register') {
    return (
      <RegisterPage
        onSuccess={() => {
          window.location.hash = '#/workspace'
        }}
      />
    )
  }

  // Superadmin Guard: verify role
  if (currentRoute === '#/superadmin') {
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
      <div>
        <AppNavbar
          currentUser={currentUser}
          currentRoute={currentRoute}
          onLogout={handleLogout}
        />
        <SuperadminPortal
          onBackToApp={() => {
            window.location.hash = '#/workspace'
          }}
        />
      </div>
    )
  }

  if (currentRoute.startsWith('#/careers')) {
    return <PublicCareerPage />
  }

  const isWorkspaceRoute =
    currentRoute === '#/workspace' ||
    currentRoute === '#/dashboard' ||
    currentRoute === '#/jobs'

  if (isWorkspaceRoute) {
    return (
      <div>
        <AppNavbar
          currentUser={currentUser}
          currentRoute={currentRoute}
          onLogout={handleLogout}
        />

        {/* Talent Intelligence Workspace Content */}
        {selectedJobId === null ? (
          <JobsDashboard
            onSelectJob={(id) => {
              setSelectedJobId(id)
              window.location.hash = `#/jobs?id=${id}`
            }}
          />
        ) : (
          <KanbanBoard
            jobId={selectedJobId}
            onBack={() => {
              setSelectedJobId(null)
              window.location.hash = '#/workspace'
            }}
          />
        )}
      </div>
    )
  }

  // Default: Public SaaS Landing Page
  return <LandingPage />
}
