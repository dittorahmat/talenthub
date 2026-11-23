import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Guardrail checks for anti-slop frontend and superadmin standards
const VIOLATIONS = []

function scanDirectory(dir, testFn) {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue
      scanDirectory(fullPath, testFn)
    } else {
      testFn(fullPath)
    }
  }
}

// 1. Check for AI-slop inline styles, emojis, and isolated dark terminal theme dynamically across all app components & pages
scanDirectory(join(process.cwd(), 'src'), (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return
  const relPath = filePath.replace(process.cwd(), '').replace(/^[\\\/]/, '')
  const content = readFileSync(filePath, 'utf-8')
  const fileLines = content.split('\n')
  fileLines.forEach((line, idx) => {
    if (/[🛡️⚡🏢🔄🔒✕⚠]/u.test(line)) {
      VIOLATIONS.push({
        file: filePath,
        line: idx + 1,
        reason: `Decorative AI Emoji Slop Detected in ${relPath}. Wajib gunakan SVG semantik atau tipografi tegas.`
      })
    }
    if (/#6366F1|border-indigo-200|bg-indigo-50/i.test(line)) {
      VIOLATIONS.push({
        file: filePath,
        line: idx + 1,
        reason: `AI Slop Color Palette (Purple/Indigo default) detected in ${relPath}. Wajib gunakan Light Slate & Teal.`
      })
    }
    // Check for inline style usage in components (excluding legacy LandingPage/LoginPage)
    if (
      (relPath.includes('CandidateCard.tsx') ||
       relPath.includes('AddCandidateForm.tsx') ||
       relPath.includes('ScreeningInbox.tsx') ||
       relPath.includes('CandidateScorecardTab.tsx') ||
       relPath.includes('OutreachTemplateModal.tsx') ||
       relPath.includes('CandidateDetailModal.tsx') ||
       relPath.includes('PublicCareerPage.tsx')) &&
      /<(a|button)\b[^>]*\bstyle=\{\{/i.test(line)
    ) {
      VIOLATIONS.push({
        file: filePath,
        line: idx + 1,
        reason: `Inline style soup detected on interactive element in ${relPath}. Wajib gunakan utility classes Tailwind v4.`
      })
    }
  })
})

// 1b. Check for banned in-memory state (new Map, new Set) at module root level in serverless API routes on Edge
scanDirectory(join(process.cwd(), 'src/api'), (filePath) => {
  if (!filePath.endsWith('.ts')) return
  const relPath = filePath.replace(process.cwd(), '').replace(/^[\\\/]/, '')
  const content = readFileSync(filePath, 'utf-8')
  const fileLines = content.split('\n')
  fileLines.forEach((line, idx) => {
    // Only flag lines with 0 leading indentation (module scope variables)
    if (/^[a-zA-Z]/.test(line)) {
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return
      if (line.includes('// allow-in-memory')) return
      if (/^(const|let|var)\s+\w+\s*=\s*new\s+(Map|Set)\b/.test(trimmed)) {
        VIOLATIONS.push({
          file: filePath,
          line: idx + 1,
          reason: `Banned Module-Level In-Memory State on Edge detected in ${relPath}: "${trimmed}". Cloudflare Workers memori isolate bersifat ephemeral dan terisolasi per-PoP. Gunakan D1/KV atau Turnstile, atau tandai "// allow-in-memory" jika aman.`
        })
      }
    }
  })
})

const superadminFile = join(process.cwd(), 'src/pages/SuperadminPortal.tsx')
const superadminContent = readFileSync(superadminFile, 'utf-8')
const lines = superadminContent.split('\n')
lines.forEach((line, idx) => {
  if (/style=\{\{/i.test(line)) {
    VIOLATIONS.push({
      file: superadminFile,
      line: idx + 1,
      reason: 'AI Slop Inline Style Detected in SuperadminPortal: gunakan class utility Tailwind alih-alih inline styles.'
    })
  }
  if (/bg-slate-950/i.test(line) && !line.includes('// allow-dark')) {
    VIOLATIONS.push({
      file: superadminFile,
      line: idx + 1,
      reason: 'Isolated Dark Terminal Theme Detected: Superadmin wajib menggunakan Light Slate Console (bg-[#F8FAFC] / bg-white).'
    })
  }
  if (/as\s+CreditTransactionType\b/.test(line) || /as\s+any\b/.test(line)) {
    VIOLATIONS.push({
      file: superadminFile,
      line: idx + 1,
      reason: 'Unsafe Type Assertion ("as Type" / "as any") detected in SuperadminPortal. Wajib gunakan domain type kanonik.'
    })
  }
})

// 2. Check for CSS Layering & Star Reset in index.css (preventing Tailwind v4 specificity collapse)
const indexCssFile = join(process.cwd(), 'src/index.css')
const indexCssContent = readFileSync(indexCssFile, 'utf-8')
if (/\*\s*\{\s*[^}]*(margin|padding):\s*0/i.test(indexCssContent)) {
  VIOLATIONS.push({
    file: indexCssFile,
    line: 1,
    reason: 'Unlayered wildcard reset (* { margin: 0; padding: 0; }) terdeteksi di index.css. Wajib gunakan @layer base { ... } agar tidak merusak Tailwind v4 spacing (:where).'
  })
}

// 2a. Check for Primitive Obsession on CreditTransactionType in Superadmin Portal
if (superadminContent.includes('type: string') && !superadminContent.includes('CreditTransactionType')) {
  VIOLATIONS.push({
    file: superadminFile,
    line: 1,
    reason: 'Primitive Obsession: AuditLog.type harus menggunakan canonical union CreditTransactionType.'
  })
}

// 2b. Check for Spacious Layout & Anti-Dempet standard in SuperadminPortal
if (!superadminContent.includes('space-y-8') && !superadminContent.includes('space-y-6')) {
  VIOLATIONS.push({
    file: superadminFile,
    line: 1,
    reason: 'Layout Dempet Violation: Main container SuperadminPortal wajib menggunakan vertical breathing room (space-y-8).'
  })
}
if (/py-1\b|py-1\.5\b|py-2\b/i.test(superadminContent) && /<td|<th/i.test(superadminContent)) {
  const tableLines = superadminContent.split('\n')
  tableLines.forEach((line, idx) => {
    if (/(<td|<th)[^>]*\bpy-(1|1\.5|2)\b/i.test(line)) {
      VIOLATIONS.push({
        file: superadminFile,
        line: idx + 1,
        reason: 'Table Cell Dempet Violation: Padding sel tabel terlalu rapat. Wajib gunakan padding lega (py-3.5 atau py-4).'
      })
    }
  })
}

// 2b. Check for unsafe type assertion in src/api/superadmin.ts
const superadminApiFile = join(process.cwd(), 'src/api/superadmin.ts')
const superadminApiContent = readFileSync(superadminApiFile, 'utf-8')
const apiLines = superadminApiContent.split('\n')
apiLines.forEach((line, idx) => {
  if (/as\s+CreditTransactionType\b/.test(line)) {
    VIOLATIONS.push({
      file: superadminApiFile,
      line: idx + 1,
      reason: 'Unsafe "as CreditTransactionType" cast in superadmin API. D1 schema wajib meng-infer enum secara kanonik.'
    })
  }
})

// 3. Check for synchronous Drizzle calls (.all(), .get(), .run()) across services and test suites
scanDirectory(join(process.cwd(), 'src/services'), (filePath) => {
  if (!filePath.endsWith('.ts')) return
  const relPath = filePath.replace(process.cwd(), '').replace(/^[\\\/]/, '')
  const content = readFileSync(filePath, 'utf-8')
  const fileLines = content.split('\n')
  fileLines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return
    // Allow bun:sqlite setup/migration scripts or explicit sqlite calls, but ban raw synchronous Drizzle operations
    if (/\bdb\.(select|insert|update|delete)\b[^;]*\.(run|all|get)\s*\(/i.test(line)) {
      VIOLATIONS.push({
        file: filePath,
        line: idx + 1,
        reason: `Synchronous Drizzle operation (.run(), .all(), .get()) detected in ${relPath}. Cloudflare D1 runtime requires asynchronous promise awaits (await db...).`
      })
    }
  })
})

const testFile = join(process.cwd(), 'tests/superadmin-ledger.test.ts')
const testContent = readFileSync(testFile, 'utf-8')
const testLines = testContent.split('\n')
testLines.forEach((line, idx) => {
  const trimmed = line.trim()
  if (trimmed.startsWith('//')) return
  if (/\.all\s*\(\s*\)/.test(line)) {
    VIOLATIONS.push({
      file: testFile,
      line: idx + 1,
      reason: 'Synchronous Drizzle query (.all()) terdeteksi di test fixture. Wajib gunakan: await db.select()...'
    })
  }
})

if (VIOLATIONS.length > 0) {
  console.error('\n❌ Architecture & Code Standards Violations Found:')
  for (const v of VIOLATIONS) {
    console.error(`  ${v.file}:${v.line}`)
    console.error(`     ↳ ${v.reason}`)
  }
  process.exit(1)
} else {
  console.log('✓ Architecture & code standards lint passed (no AI slop styling, synchronous Drizzle, or primitive obsession in Superadmin).')
}
