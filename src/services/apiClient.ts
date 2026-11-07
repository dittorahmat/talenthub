import { Candidate } from '../components/CandidateCard'

export interface Job {
  id: number
  organization_id?: number
  title: string
  location: string
  remote: string
  posted_at: string
  applicantCount: number
}

export interface JobWithApplicants extends Job {
  applicants: Candidate[]
}

export interface CreateJobInput {
  title: string
  location: string
  remote?: string
  posted_at?: string
}

export interface UpdateJobInput {
  title?: string
  location?: string
  remote?: string
}

export interface CreateApplicantInput {
  job_id: number
  name: string
  email: string
  phone?: string
  source?: string
  status?: string
}

export interface NoteItem {
  id: number
  applicantId: number
  text: string
  author: string
  created_at: string
}

export interface ActivityItem {
  id: number
  applicantId: number
  type: string
  description: string
  user: string
  timestamp: string
}

export interface ApplicantDetail extends Candidate {
  resume_url?: string
  resume_path?: string
  screening_status?: string
  screeningStatus?: string
  screening_summary?: string
  screeningSummary?: string
  summary?: string
  screening_score?: number
  screeningScore?: number
  score?: number
  screening_band?: string
  screeningBand?: string
  band?: string
  screening_verdict?: string | null
  screeningVerdict?: string | null
  verdict?: string | null
  screening_matched?: string | string[]
  screeningMatched?: string | string[]
  matched?: string | string[]
  screening_missing?: string | string[]
  screeningMissing?: string | string[]
  missing?: string | string[]
  screening_exp_years?: number
  screeningExpYears?: number
  exp_years?: number
  expYears?: number
  job?: Job | null
  notes: NoteItem[]
  activities: ActivityItem[]
  interview_questions?: string[]
}

export interface InboxItem {
  id: number
  job_id?: number
  filename: string
  file_path?: string
  file_url?: string | null
  status: string
  name?: string
  email?: string
  phone?: string
  score?: number
  band?: string
  verdict?: string
  rationale?: string
  knockout_result?: string | boolean | null
  duplicate_of?: number | string | null
  promoted_applicant_id?: number | string | null
  created_at?: string
  // Legacy / UI compat properties
  knockoutFailed?: boolean
  knockoutFailedQuestion?: string
  knockout_failed?: boolean
  knockout_question?: string
  duplicateOf?: number | string | null
  promotedApplicantId?: number | string | null
  error?: string
  reason?: string
  summary?: string
  matched?: string[] | string
  missing?: string[] | string
}

export interface KnockoutItem {
  id: number | string
  job_id?: number
  question: string
}

export interface InboxListResponse {
  items: InboxItem[]
  knockouts?: KnockoutItem[]
  knockoutQuestions?: KnockoutItem[]
}

export interface BatchProgressStatus {
  total: number
  completed: number
  failed: number
  processing: number
  queued: number
  percentage: number
  isComplete: boolean
  isProcessing: boolean
}

export interface BatchPreflightResponse {
  required: number
  current: number
  shortage: number
  allowed: boolean
}

export interface BatchUploadResponse {
  message: string
  batchId?: string
  queuedCount?: number
  reservedCredits?: number
  items?: InboxItem[]
}

export interface BatchCancelResponse {
  message: string
  refundedCredits: number
  cancelledCount?: number
}

export interface PromoteApplicantResponse {
  success: boolean
  applicant: Candidate
  inboxItemId: number
}

export interface WalletTransaction {
  id: number
  amount: number
  type: string
  description: string
  balanceAfter: number
  createdAt: string
}

export interface WalletResponse {
  balance: number
  currency: string
  updatedAt: string
  transactions?: WalletTransaction[]
}

export interface BillingPackage {
  id: 'starter' | 'growth' | 'enterprise' | string
  name: string
  credits: number
  priceIdr: number
  unitPriceIdr: number
  tag?: string
  description: string
  features: string[]
}

// ----------------------------------------------------
// Typed Domain Error Classes
// ----------------------------------------------------

export type ApiErrorCode =
  | 'INSUFFICIENT_CREDIT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'

export class ApiError extends Error {
  public readonly status: number
  public readonly code: ApiErrorCode | string
  public readonly details?: unknown

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode | string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InsufficientCreditError extends ApiError {
  public readonly required?: number
  public readonly current?: number
  public readonly shortage?: number

  constructor(
    message: string = 'Saldo kredit tidak mencukupi untuk memproses screening AI.',
    required?: number,
    current?: number,
    shortage?: number
  ) {
    super(message, 402, 'INSUFFICIENT_CREDIT', { required, current, shortage })
    this.name = 'InsufficientCreditError'
    this.required = required
    this.current = current
    this.shortage = shortage
  }
}

export class PayloadTooLargeError extends ApiError {
  constructor(message: string = 'Ukuran berkas melebihi batas yang diizinkan.') {
    super(message, 413, 'PAYLOAD_TOO_LARGE')
    this.name = 'PayloadTooLargeError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Sesi tidak valid atau telah berakhir.') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class RateLimitedError extends ApiError {
  constructor(message: string = 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.') {
    super(message, 429, 'RATE_LIMITED')
    this.name = 'RateLimitedError'
  }
}

// ----------------------------------------------------
// Error classification helpers
// ----------------------------------------------------

export function isInsufficientCredit(error: unknown): error is InsufficientCreditError {
  if (error instanceof InsufficientCreditError) return true
  if (error instanceof ApiError && (error.status === 402 || error.code === 'INSUFFICIENT_CREDIT')) return true
  return false
}

export function isPayloadTooLarge(error: unknown): error is PayloadTooLargeError {
  if (error instanceof PayloadTooLargeError) return true
  if (error instanceof ApiError && (error.status === 413 || error.code === 'PAYLOAD_TOO_LARGE')) return true
  return false
}

export function isUnauthorized(error: unknown): error is UnauthorizedError {
  if (error instanceof UnauthorizedError) return true
  if (error instanceof ApiError && (error.status === 401 || error.code === 'UNAUTHORIZED')) return true
  return false
}

export function isRateLimited(error: unknown): error is RateLimitedError {
  if (error instanceof RateLimitedError) return true
  if (error instanceof ApiError && (error.status === 429 || error.code === 'RATE_LIMITED')) return true
  return false
}

// ----------------------------------------------------
// Raw Request Handler & Response Parser
// ----------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, init)
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Koneksi jaringan gagal'
    throw new ApiError(errorMsg, 0, 'NETWORK_ERROR')
  }

  if (res.ok) {
    if (res.status === 204) {
      return undefined as unknown as T
    }
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return (await res.json()) as T
    }
    return (await res.text()) as unknown as T
  }

  // Handle structured error responses
  let rawBody: any = null
  try {
    rawBody = await res.json()
  } catch {
    try {
      rawBody = await res.text()
    } catch {
      rawBody = null
    }
  }

  const message =
    (typeof rawBody === 'object' && rawBody !== null && (rawBody.message || rawBody.error)) ||
    (typeof rawBody === 'string' && rawBody.length > 0 ? rawBody : `Request failed with status ${res.status}`)

  const errorCode: string =
    (typeof rawBody === 'object' && rawBody !== null && rawBody.error) || ''

  if (res.status === 402 || errorCode === 'INSUFFICIENT_CREDIT') {
    throw new InsufficientCreditError(
      message,
      rawBody?.required,
      rawBody?.current,
      rawBody?.shortage
    )
  }

  if (res.status === 413 || errorCode === 'PAYLOAD_TOO_LARGE' || errorCode === 'TOO_MANY_FILES') {
    throw new PayloadTooLargeError(message)
  }

  if (res.status === 401 || errorCode === 'UNAUTHORIZED') {
    throw new UnauthorizedError(message)
  }

  if (res.status === 429 || errorCode === 'RATE_LIMITED') {
    throw new RateLimitedError(message)
  }

  throw new ApiError(message, res.status, errorCode || `HTTP_${res.status}`, rawBody)
}

// ----------------------------------------------------
// TalentHubClient Implementation
// ----------------------------------------------------

export const TalentHubClient = {
  jobs: {
    list: (): Promise<Job[]> => {
      return request<Job[]>('/api/jobs')
    },
    get: (id: number): Promise<JobWithApplicants> => {
      return request<JobWithApplicants>(`/api/jobs/${id}`)
    },
    create: (data: CreateJobInput): Promise<Job> => {
      return request<Job>('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    update: (id: number, data: UpdateJobInput): Promise<Job> => {
      return request<Job>(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    delete: (id: number): Promise<{ success: boolean; id: number }> => {
      return request<{ success: boolean; id: number }>(`/api/jobs/${id}`, {
        method: 'DELETE',
      })
    },
  },

  applicants: {
    list: (jobId?: number): Promise<Candidate[]> => {
      const url = jobId ? `/api/jobs/${jobId}` : '/api/applicants'
      return request<any>(url).then(res => {
        if (jobId && res && Array.isArray(res.applicants)) {
          return res.applicants
        }
        return Array.isArray(res) ? res : res.applicants || []
      })
    },
    get: (id: number): Promise<ApplicantDetail> => {
      return request<ApplicantDetail>(`/api/applicants/${id}`)
    },
    create: (data: CreateApplicantInput): Promise<Candidate> => {
      return request<Candidate>('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    updateStage: (id: number, stage: string): Promise<{ success: boolean; id: number; status: string }> => {
      return request<{ success: boolean; id: number; status: string }>(`/api/applicants/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: stage }),
      })
    },
    uploadResume: (id: number, file: File): Promise<{ success: boolean; applicantId: number; screeningStatus?: string }> => {
      const fd = new FormData()
      fd.append('resume', file)
      return request<{ success: boolean; applicantId: number; screeningStatus?: string }>(`/api/applicants/${id}/resume`, {
        method: 'POST',
        body: fd,
      })
    },
    addNote: (id: number, text: string, author: string = 'HR Admin'): Promise<NoteItem> => {
      return request<NoteItem>(`/api/applicants/${id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author }),
      })
    },
    delete: (id: number): Promise<{ success: boolean; id: number }> => {
      return request<{ success: boolean; id: number }>(`/api/applicants/${id}`, {
        method: 'DELETE',
      })
    },
  },

  inbox: {
    list: (jobId: number, includeDismissed: boolean = false): Promise<InboxListResponse> => {
      const query = includeDismissed ? '?include=dismissed' : ''
      return request<InboxListResponse>(`/api/jobs/${jobId}/inbox${query}`)
    },
    getStatus: (jobId: number): Promise<BatchProgressStatus> => {
      return request<BatchProgressStatus>(`/api/jobs/${jobId}/inbox/status`)
    },
    preflight: (jobId: number, count: number): Promise<BatchPreflightResponse> => {
      return request<BatchPreflightResponse>(`/api/jobs/${jobId}/inbox/preflight?count=${count}`)
    },
    uploadBatch: (jobId: number, files: File[]): Promise<BatchUploadResponse> => {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      return request<BatchUploadResponse>(`/api/jobs/${jobId}/inbox`, {
        method: 'POST',
        body: fd,
      })
    },
    cancel: (jobId: number): Promise<BatchCancelResponse> => {
      return request<BatchCancelResponse>(`/api/jobs/${jobId}/inbox/cancel`, {
        method: 'POST',
      })
    },
    promote: (
      itemId: number,
      overrides?: { name?: string; email?: string }
    ): Promise<PromoteApplicantResponse> => {
      return request<PromoteApplicantResponse>(`/api/inbox/${itemId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides || {}),
      })
    },
    dismiss: (itemId: number): Promise<{ success: boolean; id: number }> => {
      return request<{ success: boolean; id: number }>(`/api/inbox/${itemId}/dismiss`, {
        method: 'POST',
      })
    },
  },

  wallet: {
    get: (): Promise<WalletResponse> => {
      return request<WalletResponse>('/api/wallet')
    },
    getHistory: (): Promise<WalletTransaction[]> => {
      return request<WalletResponse>('/api/wallet').then(w => w.transactions || [])
    },
    getPackages: (): Promise<BillingPackage[]> => {
      return request<BillingPackage[]>('/api/billing/packages')
    },
  },
}
