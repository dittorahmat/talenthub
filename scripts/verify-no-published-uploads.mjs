import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Candidate documents must never be served as static assets. This guard fails
 * the build if an uploads directory would be published from `public/` (copied
 * into `dist/`) or if a previous build already produced one.
 */
const FORBIDDEN_DIRECTORIES = ['public/uploads', 'dist/uploads']

function collectFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }
  return files
}

const problems = []

for (const directory of FORBIDDEN_DIRECTORIES) {
  if (!existsSync(directory)) continue
  if (!statSync(directory).isDirectory()) {
    problems.push(`${directory} exists and is not a directory`)
    continue
  }
  const files = collectFiles(directory)
  if (files.length > 0) {
    problems.push(`${directory} would publish ${files.length} candidate document(s) as static assets`)
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`x ${problem}`)
  }
  console.error('Candidate documents belong in private storage, not in the published asset tree.')
  process.exit(1)
}

console.log('✓ Document publishing guard passed (no uploads directory in the published asset tree).')
