import React from 'react'
import { ChartIcon } from './Icons'

interface PipelineStatsProps {
  stages: string[]
  counts: Record<string, number>
  totalCount: number
  selectedStageFilter: string | null
  onSelectStage: (stage: string | null) => void
}

export const PipelineStats: React.FC<PipelineStatsProps> = ({
  stages,
  counts,
  totalCount,
  selectedStageFilter,
  onSelectStage
}) => {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      padding: '16px 20px',
      marginBottom: '24px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChartIcon size={16} color="#0D9488" />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pipeline Funnel & Konversi
          </span>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
            (Total {totalCount} Pelamar)
          </span>
        </div>
        {selectedStageFilter && (
          <button
            onClick={() => onSelectStage(null)}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Reset Filter ({selectedStageFilter})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {stages.map((stage) => {
          const count = counts[stage] || 0
          const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
          const isSelected = selectedStageFilter === stage

          return (
            <div
              key={stage}
              onClick={() => onSelectStage(isSelected ? null : stage)}
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: '8px',
                border: isSelected ? '2px solid #0D9488' : '1px solid #F1F5F9',
                background: isSelected ? '#F0FDFA' : '#F8FAFC',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = '#F1F5F9'
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = '#F8FAFC'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#0F766E' : '#334155' }}>
                  {stage}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  {count}
                </span>
              </div>

              {/* Bar */}
              <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: isSelected ? '#0D9488' : '#14B8A6',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
                  {percentage}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
