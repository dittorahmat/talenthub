export interface HasScore {
  screening_score?: number | null
  score?: number | null
}

/**
 * Extracts a numeric score from an entity, returning null if absent or non-numeric.
 */
export function extractScore(item: HasScore | null | undefined): number | null {
  if (!item) return null
  const val = item.screening_score ?? item.score
  return typeof val === 'number' && !isNaN(val) ? val : null
}

/**
 * Compares two score-bearing items descending by score (highest score first).
 * Unscored items are sorted to the end.
 */
export function compareByScoreDesc<T extends HasScore>(a: T, b: T): number {
  const scoreA = extractScore(a)
  const scoreB = extractScore(b)
  if (scoreA === null && scoreB === null) return 0
  if (scoreA === null) return 1
  if (scoreB === null) return -1
  return scoreB - scoreA
}

/**
 * Sorts an array of score-bearing items descending by score.
 */
export function sortByScoreDesc<T extends HasScore>(items: readonly T[]): T[] {
  return [...items].sort(compareByScoreDesc)
}
