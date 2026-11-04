import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { db } from '../db'
import { user, session, account, organizations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { verifyPassword, hashPassword } from 'better-auth/crypto'

export const authRouter = new Hono()

// Better Auth standard session token cookie name
export const SESSION_COOKIE_NAME = 'better-auth.session_token'

const GENERIC_AUTH_ERROR = 'Email atau kata sandi tidak valid.'

const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const AUTH_MAX_ATTEMPTS = 10
const authAttempts = new Map<string, { count: number; resetAt: number }>()

function authAttemptKey(ipAddress: string, email: string): string {
  return `${ipAddress}|${email.trim().toLowerCase()}`
}

/**
 * Records a failed sign-in and reports whether the caller has exceeded the
 * allowance. The map is pruned opportunistically so a long-lived instance
 * cannot grow without bound.
 */
function registerFailedAttempt(key: string): boolean {
  const now = Date.now()
  const existing = authAttempts.get(key)
  if (!existing || existing.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + AUTH_ATTEMPT_WINDOW_MS })
  } else {
    existing.count += 1
  }
  if (authAttempts.size > 5000) {
    for (const [entryKey, entry] of authAttempts) {
      if (entry.resetAt <= now) authAttempts.delete(entryKey)
    }
  }
  const entry = authAttempts.get(key)
  return Boolean(entry && entry.count > AUTH_MAX_ATTEMPTS)
}

let dummyPasswordHash: Promise<string> | null = null

function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword('talenthub-timing-equalisation-dummy')
  return dummyPasswordHash
}

export interface SerializedUser {
  id: string
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'recruiter'
  organizationId: number | null
  organization?: {
    id: number
    name: string
    slug: string
  } | null
}

export function serializeUser(u: any, org?: any): SerializedUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role as 'superadmin' | 'admin' | 'recruiter') || 'recruiter',
    organizationId: u.organizationId ?? null,
    organization: org
      ? {
          id: org.id,
          name: org.name,
          slug: org.slug,
        }
      : null,
  }
}

/**
 * Universal asynchronous session resolver for Cloudflare Workers & Bun/SQLite.
 */
export async function getSessionFromRequest(c: any) {
  const token = getCookie(c, SESSION_COOKIE_NAME) || c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  try {
    const sessionList = await db.select().from(session).where(eq(session.token, token))
    const s = sessionList[0]
    if (!s) return null

    const expiresAt = s.expiresAt instanceof Date ? s.expiresAt : new Date(s.expiresAt)
    if (expiresAt < new Date()) {
      return null
    }

    const userList = await db.select().from(user).where(eq(user.id, s.userId))
    const u = userList[0]
    if (!u) return null

    let org = null
    if (u.organizationId) {
      const orgList = await db.select().from(organizations).where(eq(organizations.id, u.organizationId))
      org = orgList[0] || null
    }

    return {
      session: s,
      user: serializeUser(u, org),
    }
  } catch (err) {
    console.error('Session lookup error:', err)
    return null
  }
}

// 1. GET /api/auth/get-session
authRouter.get('/get-session', async (c) => {
  const auth = await getSessionFromRequest(c)
  if (!auth) {
    return c.json({ data: null, error: 'Unauthorized' }, 401)
  }
  return c.json({ data: auth })
})

// 2. POST /api/auth/sign-in/email (Better Auth cryptographic password verification)
authRouter.post('/sign-in/email', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password } = body

    if (!email || !password) {
      return c.json({ error: 'Email dan password wajib diisi' }, 400)
    }

    const userList = await db.select().from(user).where(eq(user.email, email.toLowerCase().trim()))
    const existingUser = userList[0]

    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '127.0.0.1'
    const attemptKey = authAttemptKey(ipAddress, email)

    const accountList = existingUser
      ? await db.select().from(account).where(eq(account.userId, existingUser.id))
      : []
    const userAcc = accountList[0]

    // Always run one hash comparison so response time does not reveal whether
    // the account exists or has a password configured.
    const hashToVerify = userAcc?.password ?? (await getDummyPasswordHash())
    const isValid = await verifyPassword({
      password,
      hash: hashToVerify,
    })

    if (!existingUser || !userAcc?.password || !isValid) {
      if (registerFailedAttempt(attemptKey)) {
        return c.json({ error: 'Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.' }, 429)
      }
      return c.json({ error: GENERIC_AUTH_ERROR }, 401)
    }

    authAttempts.delete(attemptKey)

    // Generate secure session token
    const token = 'ba_' + randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    const now = new Date()

    await db.insert(session).values({
      id: 'sess_' + randomUUID().replace(/-/g, ''),
      token,
      userId: existingUser.id,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress,
      userAgent: c.req.header('User-Agent') || 'Unknown',
    })

    setCookie(c, SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      secure: new URL(c.req.url).protocol === 'https:',
      sameSite: 'Lax',
      maxAge: 30 * 24 * 60 * 60,
    })

    let org = null
    if (existingUser.organizationId) {
      const orgList = await db.select().from(organizations).where(eq(organizations.id, existingUser.organizationId))
      org = orgList[0] || null
    }

    return c.json({
      success: true,
      token,
      user: serializeUser(existingUser, org),
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 3. POST /api/auth/sign-out
authRouter.post('/sign-out', async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME) || c.req.header('Authorization')?.replace('Bearer ', '')
  if (token) {
    try {
      await db.delete(session).where(eq(session.token, token))
    } catch {}
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
  return c.json({ success: true, message: 'Logged out successfully' })
})
