import React, { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { StageColumn } from '../components/StageColumn'
import { CandidateCard, Candidate } from '../components/CandidateCard'
import { PipelineStats } from '../components/PipelineStats'
import { CandidateDetailModal } from '../components/CandidateDetailModal'
import { AddCandidateForm } from '../components/AddCandidateForm'
import { SearchIcon } from '../components/Icons'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { CreditPill } from '../components/CreditPill'
import { orgFetch, useOrg } from '../context/OrgContext'
import { sortByScoreDesc } from '../utils/scoreRanking'

const DEFAULT_STAGES = ['Applied', 'Phone Screen', 'Technical', 'Final Interview', 'Offer', 'Hired']

interface KanbanBoardProps {
  jobId: number
  onBack: () => void
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ jobId, onBack }) => {
  const { currentOrg } = useOrg()
  const [job, setJob] = useState<any>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [activeDragCandidate, setActiveDragCandidate] = useState<Candidate | null>(null)
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [scoreBandFilter, setScoreBandFilter] = useState<string>('All')
  const [showAddModal, setShowAddModal] = useState(false)

  // Derive dynamic stages from job configuration or fallback to defaults
  const activeStages: string[] = React.useMemo(() => {
    if (job?.pipeline_stages && Array.isArray(job.pipeline_stages) && job.pipeline_stages.length > 0) {
      return job.pipeline_stages.map((s: any) => s.name || String(s))
    }
    return DEFAULT_STAGES
  }, [job?.pipeline_stages])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const loadData = () => {
    setLoading(true)
    orgFetch(`/api/jobs/${jobId}`)
      .then(res => res.json() as Promise<any>)
      .then(data => {
        setJob(data)
        const rawApplicants: Candidate[] = data.applicants || []
        // Sort candidates by screening score descending (auto-ranking)
        const sorted = sortByScoreDesc(rawApplicants)
        setCandidates(sorted)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [jobId, currentOrg.id])

  const handleStatusChange = async (id: number, newStatus: string) => {
    // Optimistic UI update
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))

    try {
      await orgFetch(`/api/applicants/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      loadData()
    } catch (err) {
      console.error(err)
      loadData()
    }
  }

  const handleDeleteCandidate = async (candidate: Candidate) => {
    if (!window.confirm(`Hapus ${candidate.name} dari pipeline? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      await orgFetch(`/api/applicants/${candidate.id}`, { method: 'DELETE' })
      if (selectedCandidate?.id === candidate.id) setSelectedCandidate(null)
      loadData()
    } catch (err) {
      console.error(err)
      loadData()
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const found = candidates.find(c => c.id.toString() === active.id)
    if (found) setActiveDragCandidate(found)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragCandidate(null)
    if (!over) return

    const activeId = parseInt(active.id.toString())
    const overId = over.id.toString()

    // If dropped directly onto a stage column
    if (activeStages.includes(overId)) {
      handleStatusChange(activeId, overId)
      return
    }

    // If dropped onto another candidate card, find that candidate's stage
    const overCandidate = candidates.find(c => c.id.toString() === overId)
    if (overCandidate && overCandidate.status) {
      handleStatusChange(activeId, overCandidate.status)
    }
  }

  // Calculate funnel counts
  const stageCounts: Record<string, number> = {}
  activeStages.forEach(s => {
    stageCounts[s] = candidates.filter(c => c.status === s).length
  })

  // Filter candidates by search, pipeline stage filter, and AI score band filter
  const displayedCandidates = candidates.filter(c => {
    const matchesFilter = selectedStageFilter ? c.status === selectedStageFilter : true
    const matchesBand = scoreBandFilter === 'All' ? true : (c.screening_band || '').toLowerCase() === scoreBandFilter.toLowerCase()
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.resume_keywords && c.resume_keywords.toLowerCase().includes(q))
    return matchesFilter && matchesBand && matchesSearch
  })

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Navigation / Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              aria-label="Kembali ke dashboard"
              onClick={onBack}
              style={{
                background: 'white',
                border: '1px solid #CBD5E1',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ← Kembali ke Dashboard
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
                {job?.title || 'Memuat Posisi...'}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                {job?.location} {job?.remote === 'Yes' && '· Remote'} {job?.remote === 'Hybrid' && '· Hybrid'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                <SearchIcon size={14} color="#94A3B8" />
              </span>
              <input
                type="text"
                placeholder="Cari kandidat atau keahlian..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 32px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  width: '200px',
                  outline: 'none',
                  background: 'white'
                }}
              />
            </div>
            <select
              value={scoreBandFilter}
              onChange={e => setScoreBandFilter(e.target.value)}
              title="Filter kecocokan kualifikasi"
              style={{
                padding: '8px 10px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: scoreBandFilter === 'All' ? '#64748B' : scoreBandFilter === 'Strong' ? '#16A34A' : scoreBandFilter === 'Potential' ? '#D97706' : '#64748B',
                background: 'white',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">Semua Skor</option>
              <option value="Strong">Strong (≥75)</option>
              <option value="Potential">Potential (50-74)</option>
              <option value="Weak">Weak (&lt;50)</option>
            </select>
            <CreditPill />
            <WorkspaceSwitcher />
            <button
              type="button"
              aria-label="Tambah kandidat baru"
              onClick={() => setShowAddModal(true)}
              style={{
                background: '#0D9488',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              + Tambah Kandidat
            </button>
          </div>
        </div>

        {/* Funnel Pipeline Stats */}
        <PipelineStats
          stages={activeStages}
          counts={stageCounts}
          totalCount={candidates.length}
          selectedStageFilter={selectedStageFilter}
          onSelectStage={setSelectedStageFilter}
        />

        {/* Filtered empty — R-27: names cause + next action */}
        {!loading && displayedCandidates.length === 0 && candidates.length > 0 && (
          <div style={{ marginBottom: '14px', padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#92400E' }}>
              Tidak ada kandidat cocok untuk filter saat ini ({scoreBandFilter !== 'All' ? `band ${scoreBandFilter}` : 'filter aktif'}{searchQuery ? ` · pencarian "${searchQuery}"` : ''}{selectedStageFilter ? ` · tahap ${selectedStageFilter}` : ''}).
            </p>
            <button type="button" onClick={() => { setSearchQuery(''); setScoreBandFilter('All'); setSelectedStageFilter(null) }} style={{ flexShrink: 0, background: 'white', border: '1px solid #FDE68A', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#92400E', cursor: 'pointer' }}>
              Reset Filter
            </button>
          </div>
        )}

        {/* Kanban Board with Drag & Drop */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
            Memuat kandidat pipeline...
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${activeStages.length}, minmax(240px, 1fr))`,
              gap: '14px',
              overflowX: 'auto',
              paddingBottom: '16px'
            }}>
              {activeStages.map((stage, idx) => {
                const columnCandidates = displayedCandidates.filter(c => c.status === stage)
                return (
                  <StageColumn
                    key={stage}
                    stage={stage}
                    candidates={columnCandidates}
                    jobTitle={job?.title}
                    stages={activeStages}
                    isLastStage={idx === activeStages.length - 1}
                    onAddCandidateClick={() => setShowAddModal(true)}
                    onSelectCandidate={setSelectedCandidate}
                    onStatusChange={handleStatusChange}
                    onDeleteCandidate={handleDeleteCandidate}
                  />
                )
              })}
            </div>

            <DragOverlay>
              {activeDragCandidate ? (
                <div style={{ opacity: 0.9, transform: 'scale(1.03)', pointerEvents: 'none' }}>
                  <CandidateCard
                    candidate={activeDragCandidate}
                    stages={activeStages}
                    onSelect={() => {}}
                    onStatusChange={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <CandidateDetailModal
            candidate={selectedCandidate}
            stages={activeStages}
            onClose={() => {
              setSelectedCandidate(null)
              loadData()
            }}
            onStatusChange={(id, newStatus) => {
              handleStatusChange(id, newStatus)
              setSelectedCandidate(prev => prev ? { ...prev, status: newStatus } : null)
            }}
            onDelete={(candidate) => handleDeleteCandidate(candidate)}
          />
        )}

        {/* Add Candidate Modal */}
        {showAddModal && (
          <AddCandidateForm
            jobId={jobId}
            stages={activeStages}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false)
              loadData()
            }}
          />
        )}
      </div>
    </div>
  )
}
