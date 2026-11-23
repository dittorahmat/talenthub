export interface PipelineStageConfig {
  id: string
  name: string
  order: number
  type: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
}

export const DEFAULT_PIPELINE_STAGES: PipelineStageConfig[] = [
  { id: 'applied', name: 'Applied', order: 1, type: 'applied' },
  { id: 'screening', name: 'AI Screening', order: 2, type: 'screening' },
  { id: 'interview', name: 'Interview', order: 3, type: 'interview' },
  { id: 'offer', name: 'Offer', order: 4, type: 'offer' },
  { id: 'hired', name: 'Hired', order: 5, type: 'hired' },
]

export function parsePipelineStages(rawStages?: string | null): PipelineStageConfig[] {
  if (!rawStages) return DEFAULT_PIPELINE_STAGES
  try {
    const parsed = JSON.parse(rawStages)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch {}
  return DEFAULT_PIPELINE_STAGES
}
