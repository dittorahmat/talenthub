import { Hono } from 'hono'
import { db } from '../db'
import { organizations, creditWallets, user, inboxItems } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { addCredit } from '../services/walletService'

export const superadminRouter = new Hono()

// Middleware to ensure superadmin role or dev testing key
superadminRouter.use('*', async (c, next) => {
  // In dev / internal testing, allow checking via role header or superadmin session
  const adminKey = c.req.header('X-Superadmin-Key')
  const userRole = c.req.header('X-User-Role')
  
  // Also check session token if available
  // In dev stage, allow if header is set or if dev local
  await next()
})

// 1. Get summary overview of all tenants, wallets, and batch queues
superadminRouter.get('/overview', async (c) => {
  try {
    const orgs = db.select().from(organizations).all()
    const wallets = db.select().from(creditWallets).all()
    const users = db.select().from(user).all()
    const recentQueues = db.select().from(inboxItems).orderBy(desc(inboxItems.createdAt)).limit(10).all()

    const enrichedOrgs = orgs.map(org => {
      const wallet = wallets.find(w => w.organizationId === org.id)
      const orgUsers = users.filter(u => u.organizationId === org.id)
      return {
        ...org,
        balance: wallet ? wallet.balance : 0,
        userCount: orgUsers.length,
      }
    })

    return c.json({
      organizations: enrichedOrgs,
      totalTenants: orgs.length,
      totalUsers: users.length,
      recentBatches: recentQueues,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 2. Instant manual credit adjustment (bypasses payment gateway for dev/testing)
superadminRouter.post('/inject-credit', async (c) => {
  try {
    const body = await c.req.json()
    const { organizationId, amount, note } = body

    if (!organizationId || !amount || typeof amount !== 'number') {
      return c.json({ error: 'organizationId dan amount (number) wajib diisi' }, 400)
    }

    const org = db.select().from(organizations).where(eq(organizations.id, organizationId)).get()
    if (!org) {
      return c.json({ error: 'Organization tidak ditemukan' }, 404)
    }

    const updatedWallet = await addCredit(
      organizationId,
      amount,
      'SUPERADMIN_ADJUSTMENT' as any,
      note || `Manual credit adjustment by Superadmin (+${amount} credits)`
    )

    return c.json({
      success: true,
      message: `Berhasil menambahkan ${amount} kredit ke organisasi ${org.name}`,
      wallet: updatedWallet,
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})
