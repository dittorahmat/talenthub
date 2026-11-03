import { Hono } from 'hono'
import { OrgEnv } from '../middleware/orgContext'
import { getWallet, getTransactions, addCredit } from '../services/walletService'

export const walletRouter = new Hono<OrgEnv>()

// GET /api/wallet
walletRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const wallet = await getWallet(orgId)
  const transactions = await getTransactions(orgId, 50)

  return c.json({
    balance: wallet.balance,
    currency: 'CREDIT',
    updatedAt: wallet.updatedAt,
    transactions: transactions.map(t => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt,
    })),
  })
})

// POST /api/wallet/topup (mock top up / purchase endpoint for UI and tests)
walletRouter.post('/topup', async (c) => {
  const orgId = c.get('orgId')
  const body = await c.req.json().catch(() => ({}))
  const amount = Number(body.amount) || 100
  const description = body.description || `Top Up ${amount} Kredit`

  try {
    const result = await addCredit(orgId, amount, 'PURCHASE', description)
    return c.json({
      success: true,
      balance: result.newBalance,
      transaction: result.transaction,
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to top up' }, 400)
  }
})
