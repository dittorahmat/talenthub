import React from 'react'
import { TrialOnboardingModal } from '../components/TrialOnboardingModal'

interface RegisterPageProps {
  onSuccess: () => void
}

export function RegisterPage({ onSuccess }: RegisterPageProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F0FDFA 0%, #E2E8F0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <TrialOnboardingModal
        isOpen={true}
        onClose={() => {
          window.location.hash = '#/'
        }}
        onClaimSuccess={() => {
          onSuccess()
        }}
      />
    </div>
  )
}
