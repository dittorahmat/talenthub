import { promises as fs } from 'fs'
import path from 'path'

/**
 * Candidate documents live in private object storage. On Cloudflare Workers the
 * R2 binding (`CV_STORAGE`) is authoritative; on Bun the fallback is a directory
 * under `data/`, which is never part of the published asset tree.
 */
export interface StoredDocument {
  data: ArrayBuffer
  contentType: string
}

let r2Bucket: R2Bucket | null = null

export function initDocumentStorage(bucket?: R2Bucket | null): void {
  if (bucket) {
    r2Bucket = bucket
  }
}

const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain; charset=utf-8',
}

export function contentTypeForFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES_BY_EXTENSION[ext] ?? 'application/octet-stream'
}

function localRoot(): string {
  return path.join(process.cwd(), 'data', 'private-documents')
}

/**
 * Keys are built by the application, never by the client. Rejecting anything
 * outside the safe alphabet (and any `..` segment) prevents path traversal if a
 * stored key is ever fed back into the local filesystem adapter.
 */
export function assertSafeDocumentKey(key: string): void {
  if (!key || !/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(key) || key.includes('..')) {
    throw new Error('Invalid document key')
  }
}

function localPathForKey(key: string): string {
  assertSafeDocumentKey(key)
  return path.join(localRoot(), key)
}

export async function putDocument(
  key: string,
  data: Uint8Array,
  contentType: string,
): Promise<void> {
  assertSafeDocumentKey(key)
  if (r2Bucket) {
    await r2Bucket.put(key, data, { httpMetadata: { contentType } })
    return
  }
  const filePath = localPathForKey(key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, data)
}

export async function getDocument(key: string): Promise<StoredDocument | null> {
  if (!key) return null
  assertSafeDocumentKey(key)

  if (r2Bucket) {
    const object = await r2Bucket.get(key)
    if (!object) return null
    return {
      data: await object.arrayBuffer(),
      contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
    }
  }

  try {
    const data = await fs.readFile(localPathForKey(key))
    const bytes = new Uint8Array(data)
    return {
      data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      contentType: contentTypeForFilename(key),
    }
  } catch {
    return null
  }
}

export async function deleteDocument(key: string | null | undefined): Promise<void> {
  if (!key) return
  assertSafeDocumentKey(key)

  if (r2Bucket) {
    await r2Bucket.delete(key)
    return
  }

  await fs.rm(localPathForKey(key), { force: true })
}

export async function deleteDocuments(keys: Array<string | null | undefined>): Promise<void> {
  for (const key of keys) {
    await deleteDocument(key)
  }
}

/** True when the key already points at tenant-scoped storage. */
export function isPrivateDocumentKey(value: string | null | undefined): boolean {
  if (!value) return false
  return value.startsWith('orgs/') && !value.startsWith('/') && !value.startsWith('http')
}
