import React, { useState } from 'react'

interface LoginPageProps {
  onLoginSuccess: (user: any) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk. Periksa kembali email dan password Anda.')
      }

      onLoginSuccess(data.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #F0FDFA 0%, #E2E8F0 100%)',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        padding: '36px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #E2E8F0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '22px',
            margin: '0 auto 12px'
          }}>
            T
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>Masuk ke TalentHub</h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
            Akses workspace Talent Intelligence & AI Screening
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '13px',
            color: '#991B1B',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Email Perusahaan
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Password</label>
              <a href="#/login" style={{ fontSize: '12px', color: '#0D9488', textDecoration: 'none' }}>Lupa sandi?</a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#0D9488',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.3)'
            }}
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Workspace'}
          </button>
        </form>

        {/* Quick Demo Logins for Fast Dev Testing */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', textAlign: 'center' }}>
            ⚡ One-Click Testing Credentials
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('superadmin@talenthub.ai', 'Admin123!@#')}
              style={{
                flex: 1,
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#4338CA',
                cursor: 'pointer'
              }}
            >
              👑 Superadmin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('recruiter@tech1solusi.com', 'Demo123!@#')}
              style={{
                flex: 1,
                background: '#F0FDFA',
                border: '1px solid #99F6E4',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0F766E',
                cursor: 'pointer'
              }}
            >
              🏢 HR Recruiter
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748B' }}>
          Belum punya akun tim?{' '}
          <a href="#/register" style={{ color: '#0D9488', fontWeight: 600, textDecoration: 'none' }}>
            Klaim 20 Free Trial
          </a>
        </div>
      </div>
    </div>
  )
}
