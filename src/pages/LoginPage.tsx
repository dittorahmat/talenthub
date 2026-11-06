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

      const data: any = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your email and password.')
      }

      onLoginSuccess(data.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ground)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-card)',
        padding: '40px 32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>TalentHub</span>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              background: 'var(--pill-neutral-bg)',
              color: 'var(--pill-neutral-ink)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              AUTENTIKASI AMAN
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Masuk ke Workspace
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            Masukkan akun resmi perusahaan Anda untuk mengakses antrean skrining kandidat.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--pill-negative-bg)',
            color: 'var(--pill-negative-ink)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-control)',
            padding: '10px 14px',
            fontSize: '13px',
            marginBottom: '20px',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
              Email Perusahaan
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@perusahaan.co.id"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid var(--border)',
                outline: 'none',
                background: 'var(--surface)'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                Kata Sandi
              </label>
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
                fontSize: '14px',
                border: '1px solid var(--border)',
                outline: 'none',
                background: 'var(--surface)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Workspace'}
          </button>
        </form>

        {/* Register & Return Link */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
          Belum memiliki workspace perusahaan?{' '}
          <a href="#/register" style={{ color: 'var(--chart-primary)', fontWeight: 600 }}>
            Daftar Uji Coba Gratis
          </a>
          <span style={{ margin: '0 8px' }}>·</span>
          <a href="#/" style={{ color: 'var(--muted)' }}>
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  )
}
