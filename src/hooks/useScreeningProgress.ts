import { useState, useEffect, useRef, useCallback } from 'react'
import { TalentHubClient, BatchProgressStatus } from '../services/apiClient'

export interface UseScreeningProgressOptions {
  enabled?: boolean
  intervalMs?: number
  maxAttempts?: number
  onComplete?: () => void
  onError?: (error: Error) => void
}

export interface UseScreeningProgressResult {
  progress: BatchProgressStatus | null
  isProcessing: boolean
  isComplete: boolean
  percentage: number
  total: number
  completed: number
  failed: number
  queued: number
  error: Error | null
  refetch: () => Promise<BatchProgressStatus | null>
  cancel: () => Promise<void>
}

const DEFAULT_INTERVAL_MS = 1500
const DEFAULT_MAX_ATTEMPTS = 60

export function useScreeningProgress(
  jobId: number | null,
  options: UseScreeningProgressOptions = {}
): UseScreeningProgressResult {
  const {
    enabled = true,
    intervalMs = DEFAULT_INTERVAL_MS,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    onComplete,
    onError,
  } = options

  const [progress, setProgress] = useState<BatchProgressStatus | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const attemptsRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  // Stable callback references to prevent infinite loops
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const fetchStatus = useCallback(async (): Promise<BatchProgressStatus | null> => {
    if (!jobId || !enabled) return null
    try {
      const status = await TalentHubClient.inbox.getStatus(jobId)
      if (!mountedRef.current) return null

      setProgress(status)
      setError(null)

      if (status.isComplete || (!status.isProcessing && status.queued === 0)) {
        clearTimer()
        onCompleteRef.current?.()
      }

      return status
    } catch (err: unknown) {
      if (!mountedRef.current) return null
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      onErrorRef.current?.(e)
      return null
    }
  }, [jobId, enabled, clearTimer])

  const cancelBatch = useCallback(async () => {
    if (!jobId) return
    try {
      await TalentHubClient.inbox.cancel(jobId)
      window.dispatchEvent(new Event('walletChanged'))
      await fetchStatus()
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      onErrorRef.current?.(e)
      throw e
    }
  }, [jobId, fetchStatus])

  // Polling management
  useEffect(() => {
    mountedRef.current = true

    if (!jobId || !enabled) {
      clearTimer()
      return
    }

    // Initial check
    fetchStatus().then((status) => {
      if (!status || !mountedRef.current) return

      // If active processing or items in queue, start polling
      if (status.isProcessing || status.queued > 0) {
        clearTimer()
        attemptsRef.current = 0

        timerRef.current = window.setInterval(async () => {
          attemptsRef.current += 1
          if (attemptsRef.current >= maxAttempts) {
            clearTimer()
            return
          }

          const current = await fetchStatus()
          if (!current || current.isComplete || (!current.isProcessing && current.queued === 0)) {
            clearTimer()
          }
        }, intervalMs)
      }
    })

    return () => {
      mountedRef.current = false
      clearTimer()
    }
  }, [jobId, enabled, intervalMs, maxAttempts, clearTimer, fetchStatus])

  const isProcessing = progress ? progress.isProcessing || progress.queued > 0 : false
  const isComplete = progress ? progress.isComplete : false
  const percentage = progress?.percentage ?? (progress && progress.total > 0 ? Math.round(((progress.completed + progress.failed) / progress.total) * 100) : 0)
  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const failed = progress?.failed ?? 0
  const queued = progress?.queued ?? 0

  return {
    progress,
    isProcessing,
    isComplete,
    percentage,
    total,
    completed,
    failed,
    queued,
    error,
    refetch: fetchStatus,
    cancel: cancelBatch,
  }
}
