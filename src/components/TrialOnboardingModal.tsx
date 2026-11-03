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

      const data = (await res.json() as any)
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate onboarding')
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
              20 TRIAL CREDITS
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              Step {step === 'REGISTER' ? '1 of 2' : '2 of 2'}
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {step === 'REGISTER' ? 'Claim Free Corporate Trial' : 'Verify WhatsApp OTP'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.5 }}>
            {step === 'REGISTER'
              ? 'Enter your corporate organization details. Public email domains (gmail, yahoo, etc.) are restricted.'
              : `Enter the 6-digit verification code sent to ${phoneWhatsapp}.`}
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
                Company Name
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
                Corporate Admin Email
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
                Must be an authentic corporate domain (anti-abuse check)
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
                WhatsApp Number
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
              {loading ? 'Sending WhatsApp OTP...' : 'Send Verification OTP'}
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
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>Testing Simulation OTP:</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--chart-primary)' }}>
                  {mockOtpHint}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
                Enter 6-Digit OTP
              </label>
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
              {loading ? 'Verifying & Granting Credits...' : 'Verify OTP & Activate 20 Credits'}
            </button>

            <button
              type="button"
              onClick={() => setStep('REGISTER')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '12px',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              ← Back to Registration Details
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
