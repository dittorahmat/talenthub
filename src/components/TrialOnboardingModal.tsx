import React, { useState, useEffect } from 'react'
import { useOrg } from '../context/OrgContext'

interface TrialOnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newOrgId: number) => void
}

export const TrialOnboardingModal: React.FC<TrialOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { refreshOrganizations, setOrganizationId } = useOrg()
  const [step, setStep] = useState<'REGISTER' | 'OTP'>('REGISTER')
  const [companyName, setCompanyName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [mockOtpHint, setMockOtpHint] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number>(60)
  const [canResend, setCanResend] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let timer: any = null
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [step, countdown])

  if (!isOpen) return null

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          adminEmail,
          phoneWhatsapp,
        }),
      })

      const data = (await res.json() as any)
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate onboarding')
      }

      if (data.mockOtp) {
        setMockOtpHint(data.mockOtp)
      }
      setStep('OTP')
      setCountdown(60)
      setCanResend(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/onboarding/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneWhatsapp,
          otpCode,
          companyName,
        }),
      })

      const data = (await res.json() as any)
      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP code')
      }

      await refreshOrganizations()
      if (data.organization?.id) {
        setOrganizationId(data.organization.id)
        onSuccess(data.organization.id)
      }
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          width: '100%',
          maxWidth: '460px',
          padding: '36px 32px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          border: '1px solid var(--border)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            fontSize: '18px',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'var(--pill-positive-bg)',
              color: 'var(--pill-positive-ink)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              GRATIS 20 KREDIT EVALUASI
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              Langkah {step === 'REGISTER' ? '1 dari 2' : '2 dari 2'}
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {step === 'REGISTER' ? 'Daftar Uji Coba Gratis Perusahaan' : 'Verifikasi OTP WhatsApp'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.5 }}>
            {step === 'REGISTER'
              ? 'Masukkan detail profil perusahaan Anda. Pendaftaran uji coba gratis mensyaratkan domain email resmi kantor (contoh: hr@perusahaan.co.id).'
              : `Masukkan 6-digit kode verifikasi yang dikirimkan ke nomor ${phoneWhatsapp}.`}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--pill-negative-bg)',
              color: 'var(--pill-negative-ink)',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-control)',
              fontSize: '13px',
              marginBottom: '20px',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        {step === 'REGISTER' ? (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
                Nama Perusahaan / Organisasi
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="PT Inovasi Digital"
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

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
                Email Kantor Administrator
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="recruiter@inovasidigital.co.id"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  background: 'var(--surface)'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Gunakan email korporat resmi (domain umum seperti @gmail atau @yahoo akan otomatis ditolak).
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
                Nomor WhatsApp Aktif
              </label>
              <input
                type="tel"
                required
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
                placeholder="628123456789"
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
                marginTop: '8px',
                padding: '11px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Mengirim OTP WhatsApp...' : 'Kirim Kode Verifikasi WhatsApp'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mockOtpHint && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--pill-neutral-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  fontSize: '12px',
                  color: 'var(--text)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>Kode Simulasi Testing (Dev):</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--chart-primary)' }}>
                  {mockOtpHint}
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                  Masukkan 6-Digit Kode OTP
                </label>
                <span className="tabular-numbers" style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  {countdown > 0 ? `Berlaku ${countdown} dtk` : 'Kedaluwarsa'}
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '20px',
                  letterSpacing: '0.25em',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
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
                marginTop: '8px',
                padding: '11px',
                backgroundColor: 'var(--positive)',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Memverifikasi...' : 'Verifikasi OTP & Aktifkan 20 Kredit'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setStep('REGISTER')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ← Ubah Data Perusahaan
              </button>

              <button
                type="button"
                disabled={!canResend || loading}
                onClick={() => handleRegister()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: canResend ? 'var(--chart-primary)' : 'var(--muted)',
                  fontSize: '12px',
                  cursor: canResend ? 'pointer' : 'not-allowed',
                  textDecoration: canResend ? 'underline' : 'none'
                }}
              >
                Kirim Ulang OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
