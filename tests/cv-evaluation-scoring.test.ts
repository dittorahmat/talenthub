import { describe, it, expect } from 'bun:test'
import { zipSync, strToU8 } from 'fflate'
import {
  extractTextFromBuffer,
  isCorruptedOrUnreadableBuffer,
  evaluateWithSmartHeuristics,
} from '../src/services/aiScreeningService'

describe('Multi-Format CV Parser & Composite Scoring', () => {
  it('extracts text cleanly from plain text resumes', () => {
    const text = 'John Doe. Experienced Frontend Developer with 5 years of React and TypeScript. Education: S1 Teknik Informatika.'
    const buffer = Buffer.from(text, 'utf-8')
    const extracted = extractTextFromBuffer(buffer, 'resume.txt')
    expect(extracted).toContain('John Doe')
    expect(extracted).toContain('React')
  })

  it('extracts text cleanly from DOCX files using zip xml parsing', () => {
    // Generate valid mock docx in memory using fflate
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>Jane Smith</w:t></w:r></w:p>
        <w:p><w:r><w:t>Backend Engineer with 4 years experience in Node.js, SQL, Docker and AWS.</w:t></w:r></w:p>
        <w:p><w:r><w:t>Bachelor Degree in Computer Science, AWS Certified Solutions Architect.</w:t></w:r></w:p>
      </w:body>
    </w:document>`

    const zipped = zipSync({
      'word/document.xml': strToU8(docXml),
    })

    const buffer = Buffer.from(zipped)
    const extracted = extractTextFromBuffer(buffer, 'jane_resume.docx')
    expect(extracted).toContain('Jane Smith')
    expect(extracted).toContain('Backend Engineer')
    expect(extracted).toContain('Node.js')
    expect(extracted).toContain('AWS Certified')
  })

  it('rejects legacy .doc files as corrupted/unreadable in server parser', () => {
    const buffer = Buffer.from('Binary Word 97-2004 format simulation', 'utf-8')
    const isCorrupt = isCorruptedOrUnreadableBuffer(buffer, 'old_resume.doc')
    expect(isCorrupt).toBe(true)
  })

  it('calculates composite score (0-100) with transparent weights', () => {
    const cvText = `
      Budi Santoso
      Pengalaman 5 tahun sebagai Frontend Engineer.
      Keahlian: React, TypeScript, JavaScript, Node.js, Git, CI/CD.
      Pendidikan: Sarjana Komputer S1. Portofolio: https://github.com/budi.
    `
    const result = evaluateWithSmartHeuristics(
      cvText,
      'Senior Frontend Developer',
      'Budi Santoso',
      ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Git', 'CI/CD']
    )

    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.band).toBe('Strong')
    expect(result.verdict).toBe('Hire')
    expect(result.matchedSkills).toContain('React')
    expect(result.matchedSkills).toContain('TypeScript')
    expect(result.scoreBreakdown).toBeDefined()
    expect(result.scoreBreakdown?.skillMatchScore).toBe(50) // 100% matched skills * 50
    expect(result.scoreBreakdown?.experienceScore).toBe(30) // 5+ years * 30
    expect(result.scoreBreakdown?.supportingFactorsScore).toBe(20) // degree + github portfolio
  })

  it('marks low qualification CV as Weak with pass verdict', () => {
    const cvText = `
      Andi Pratama
      Pengalaman 1 tahun magang administrasi kantor.
      Keahlian: Microsoft Office, Excel.
    `
    const result = evaluateWithSmartHeuristics(
      cvText,
      'Lead DevOps Engineer',
      'Andi Pratama',
      ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD']
    )

    expect(result.score).toBeLessThan(50)
    expect(result.band).toBe('Weak')
    expect(result.verdict).toBe('Pass')
    expect(result.missingSkills.length).toBeGreaterThan(0)
  })
})
