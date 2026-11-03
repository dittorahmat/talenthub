import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Prohibited phrases as defined in AGENTS.md Copywriting rules (AI-tells and negative lists)
const BANNED_PATTERNS = [
  { pattern: /tanpa\s+biaya\b/i, reason: 'Negative lead-out pattern ("Tanpa biaya X"). Nyatakan secara afirmatif (misal: "Model bayar sesuai pemakaian").' },
  { pattern: /tanpa\s+ribet/i, reason: 'AI-cliché negative list ("Tanpa ribet").' },
  { pattern: /tanpa\s+pusing/i, reason: 'AI-cliché negative list ("Tanpa pusing").' },
  { pattern: /tanpa\s+repot/i, reason: 'AI-cliché negative list ("Tanpa repot").' },
  { pattern: /bukan\s+sekad?ar\b/i, reason: 'Cheap contrast AI pattern ("Ini bukan sekadar X, ini adalah Y").' },
  { pattern: /terbaik\s+di\s+kelasnya/i, reason: 'Vague unverifiable puffery ("terbaik di kelasnya"). Gunakan bukti spesifik.' },
  { pattern: /solusi\s+revolusioner/i, reason: 'Vague unverifiable puffery ("solusi revolusioner").' },
  { pattern: /kesenjangan\s+keahlian\s*\/\s*gap/i, reason: 'Mixed bilingual redundancy. Gunakan padanan tunggal konsisten ("Kesenjangan Keahlian").' }
]

function scanDirectory(dir, violations = []) {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue
      scanDirectory(fullPath, violations)
    } else if (/\.(tsx|ts|html)$/.test(entry) && !entry.includes('.test.')) {
      const content = readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, index) => {
        for (const { pattern, reason } of BANNED_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: fullPath,
              line: index + 1,
              text: line.trim(),
              reason
            })
          }
        }
      })
    }
  }
  return violations
}

const targetDir = join(process.cwd(), 'src')
const violations = scanDirectory(targetDir)

if (violations.length > 0) {
  console.error('\n❌ Copywriting Lint Errors Found:')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> "${v.text}"`)
    console.error(`    ↳ Alasan: ${v.reason}\n`)
  }
  process.exit(1)
} else {
  console.log('✓ Copywriting lint passed (no AI tells or banned negative patterns detected).')
}
