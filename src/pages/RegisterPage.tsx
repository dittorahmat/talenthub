import React from 'react'
import { TrialOnboardingModal } from '../components/TrialOnboardingModal'

interface RegisterPageProps {
  onSuccess: (newOrgId?: number) => void
}

export function RegisterPage({ onSuccess }: RegisterPageProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ground)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-sans)'
    }}>
      <TrialOnboardingModal
        isOpen={true}
        onClose={() => {
          window.location.hash = '#/'
        }}
        onSuccess={(newOrgId) => {
          onSuccess(newOrgId)
        }}
      />
    </div>
  )
}
