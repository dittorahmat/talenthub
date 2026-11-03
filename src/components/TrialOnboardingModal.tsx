import React, { useState } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
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

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan perusahaan')
      }

      if (data.mockOtp) {
        setMockOtpHint(data.mockOtp)
      }
      setStep('OTP')
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

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Verifikasi OTP gagal')
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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
          background: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #F1F5F9',
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: 'white',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>🚀</span>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>
              Daftar Perusahaan Baru
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#E0F2FE', lineHeight: '1.4' }}>
            Klaim <strong>Free Trial 20 Kredit Screening CV AI</strong> untuk perusahaan atau organisasi Anda.
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#B91C1C',
                lineHeight: '1.4',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {step === 'REGISTER' ? (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Nama Perusahaan / PT *
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: PT Maju Bersama Teknologi"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Email Perusahaan Resmi *
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh: recruiter@namaperusahaan.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  ℹ️ Email publik (@gmail.com, @yahoo.com) ditolak untuk verifikasi trial anti-abuse.
                </span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Nomor WhatsApp Recruiter *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="misal: 081234567890"
                  value={phoneWhatsapp}
                  onChange={(e) => setPhoneWhatsapp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Kode OTP 6-digit akan dikirimkan untuk verifikasi kepemilikan nomor.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    background: 'white',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: loading ? '#93C5FD' : '#0284C7',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {loading ? 'Mengirim OTP...' : 'Kirim Kode OTP WhatsApp'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#166534',
                }}
              >
                📲 Kode verifikasi OTP telah dikirimkan ke WhatsApp nomor <strong>{phoneWhatsapp}</strong>.
              </div>

              {mockOtpHint && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '10px 12px',
                    background: '#F8FAFC',
                    border: '1px dashed #94A3B8',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    Demo Mode OTP: <strong>{mockOtpHint}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(mockOtpHint)}
                    style={{
                      background: '#0284C7',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Auto-Fill OTP
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Masukkan 6-Digit Kode OTP *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '6px',
                    textAlign: 'center',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStep('REGISTER')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  ← Ubah nomor WhatsApp
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      background: 'white',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: loading || otpCode.length !== 6 ? '#93C5FD' : '#16A34A',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: loading || otpCode.length !== 6 ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    {loading ? 'Memverifikasi...' : 'Verifikasi & Klaim 20 Kredit'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
