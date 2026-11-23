import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CandidateCard, Candidate } from './CandidateCard'

interface StageColumnProps {
  stage: string
  candidates: Candidate[]
  jobTitle?: string
  stages: string[]
  isLastStage: boolean
  onAddCandidateClick?: () => void
  onSelectCandidate: (candidate: Candidate) => void
  onStatusChange: (id: number, newStatus: string) => void
  onDeleteCandidate: (candidate: Candidate) => void
  onScreenCandidate?: (candidate: Candidate) => void
}

export const StageColumn: React.FC<StageColumnProps> = ({
  stage,
  candidates,
  jobTitle,
  stages,
  isLastStage,
  onAddCandidateClick,
  onSelectCandidate,
  onStatusChange,
  onDeleteCandidate,
  onScreenCandidate,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      style={{
        background: '#F1F5F9',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 270px)',
        minWidth: '260px',
        border: isOver ? '2px dashed #0D9488' : '1px solid #E2E8F0',
        transition: 'border 0.2s ease'
      }}
    >
      {/* Column Header */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {stage}
          </h3>
          <span style={{
            background: '#E2E8F0',
            color: '#475569',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {candidates.length}
          </span>
        </div>

        {isLastStage && onAddCandidateClick && (
          <button
            onClick={onAddCandidateClick}
            title="Tambah Kandidat"
            style={{
              background: '#0D9488',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Add
          </button>
        )}
      </div>

      {/* Drop Zone / Candidate List */}
      <div
        ref={setNodeRef}
        style={{
          padding: '12px',
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <SortableContext items={candidates.map(c => c.id.toString())} strategy={verticalListSortingStrategy}>
          {candidates.map(candidate => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              jobTitle={jobTitle}
              stages={stages}
              onSelect={onSelectCandidate}
              onStatusChange={onStatusChange}
              onDelete={onDeleteCandidate}
              onScreenCandidate={onScreenCandidate}
            />
          ))}
        </SortableContext>

        {candidates.length === 0 && (
          <div style={{
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            fontSize: '12px',
            border: '1px dashed #CBD5E1',
            borderRadius: '8px'
          }}>
            Tarik kandidat ke sini
          </div>
        )}
      </div>
    </div>
  )
}
