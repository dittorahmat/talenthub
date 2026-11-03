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
    if (!existingUser) {
      return c.json({ error: 'Kredensial tidak valid. Silakan periksa kembali email Anda.' }, 401)
    }

    const accountList = await db.select().from(account).where(eq(account.userId, existingUser.id))
    const userAcc = accountList[0]
    if (!userAcc || !userAcc.password) {
      return c.json({ error: 'Akun ini belum memiliki kata sandi terkonfigurasi.' }, 401)
    }

    // Verify using standard Better Auth cryptographic scrypt/PBKDF2 hash verification
    const isValid = await verifyPassword({
      password,
      hash: userAcc.password,
    })

    if (!isValid) {
      return c.json({ error: 'Password tidak sesuai' }, 401)
    }

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
      ipAddress: c.req.header('CF-Connecting-IP') || '127.0.0.1',
      userAgent: c.req.header('User-Agent') || 'Unknown',
    })

    setCookie(c, SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: false,
      secure: false,
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
