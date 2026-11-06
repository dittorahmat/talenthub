export const DEFAULT_WORKER_ORIGIN = 'https://talenthub.tech1solusi.workers.dev'
export const DEFAULT_DEV_ORIGIN = 'http://localhost:5173'

/**
 * Parses a comma-separated origin allowlist, falling back to a single default.
 * A wildcard is never produced, so a missing configuration cannot silently
 * open the API to every origin.
 */
export function resolveAllowedOrigins(configured: string | undefined, fallback: string): string[] {
  const value = configured?.trim()
  if (!value || value === '*') return [fallback]
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  return origins.length > 0 ? origins : [fallback]
}
