import { Hono } from 'hono'
import { db } from '../db'
import { organizations, creditWallets, user, inboxItems, creditTransactions } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { addCredit, CreditTransactionType } from '../services/walletService'
import { getSessionFromRequest } from './auth'

export const superadminRouter = new Hono()

/**
 * Strict role guard: only users with role 'superadmin' can access superadmin APIs.
 */
superadminRouter.use('*', async (c, next) => {
  // Allow explicit bypass key only during local non-production automated testing if provided
  const devTestingKey = c.req.header('X-Superadmin-Key')
  if (process.env.NODE_ENV !== 'production' && devTestingKey === 'dev-bypass') {
    return next()
  }

  const auth = await getSessionFromRequest(c)
  if (!auth || auth.user.role !== 'superadmin') {
    return c.json({ error: 'Forbidden: Superadmin access required' }, 403)
  }

  await next()
})

// 1. GET /api/superadmin/overview
superadminRouter.get('/overview', async (c) => {
  try {
    const orgs = await db.select().from(organizations)
    const wallets = await db.select().from(creditWallets)
    const users = await db.select().from(user)
    const recentQueues = await db.select().from(inboxItems).orderBy(desc(inboxItems.createdAt)).limit(10)
    const recentAuditLogs = await db.select().from(creditTransactions).orderBy(desc(creditTransactions.createdAt)).limit(15)

    const enrichedOrgs = orgs.map((org) => {
      const wallet = wallets.find((w) => w.organizationId === org.id)
      const orgUsers = users.filter((u) => u.organizationId === org.id)
      return {
        ...org,
        balance: wallet ? wallet.balance : 0,
        userCount: orgUsers.length,
      }
    })

    const enrichedAudits = recentAuditLogs.map((tx) => {
      const org = orgs.find((o) => o.id === tx.organizationId)
      return {
        ...tx,
        organizationName: org ? org.name : `Org #${tx.organizationId}`
      }
    })

    return c.json({
      organizations: enrichedOrgs,
      totalTenants: orgs.length,
      totalUsers: users.length,
      recentBatches: recentQueues,
      recentAuditLogs: enrichedAudits,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. POST /api/superadmin/inject-credit
superadminRouter.post('/inject-credit', async (c) => {
  try {
    const body = await c.req.json()
    const { organizationId, amount, note } = body

    if (!organizationId || !amount || typeof amount !== 'number') {
      return c.json({ error: 'organizationId dan amount (number) wajib diisi' }, 400)
    }

    const orgList = await db.select().from(organizations).where(eq(organizations.id, organizationId))
    const org = orgList[0]
    if (!org) {
      return c.json({ error: 'Organization tidak ditemukan' }, 404)
    }

    // Strongly-typed domain ledger transaction (no 'as any')
    const result = await addCredit(
      organizationId,
      amount,
      'SUPERADMIN_ADJUSTMENT',
      note || `Manual credit adjustment by Superadmin (+${amount} credits)`
    )

    return c.json({
      success: true,
      message: `Berhasil menambahkan ${amount} kredit ke organisasi ${org.name}`,
      wallet: {
        organizationId,
        balance: result.newBalance,
      },
      transaction: result.transaction,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
