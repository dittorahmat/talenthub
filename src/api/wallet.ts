import { Hono } from 'hono'
import { OrgEnv } from '../middleware/orgContext'
import { getWallet, getTransactions } from '../services/walletService'

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
