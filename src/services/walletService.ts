import { db, sqlite } from '../db'
import { creditWallets, creditTransactions } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

export interface WalletData {
  id: number
  organizationId: number
  balance: number
  updatedAt: string
}

export interface TransactionData {
  id: number
  walletId: number
  organizationId: number
  amount: number
  type: string
  description: string | null
  balanceAfter: number
  createdAt: string
}

function mapTransactionRow(row: any): TransactionData {
  return {
    id: row.id,
    walletId: row.wallet_id ?? row.walletId,
    organizationId: row.organization_id ?? row.organizationId,
    amount: row.amount,
    type: row.type,
    description: row.description,
    balanceAfter: row.balance_after ?? row.balanceAfter,
    createdAt: row.created_at ?? row.createdAt,
  }
}

/**
 * Ensures a wallet exists for the given organization.
 * If not, creates one with 0 balance.
 */
export async function getOrCreateWallet(orgId: number): Promise<WalletData> {
  let wallet = await db.select().from(creditWallets).where(eq(creditWallets.organizationId, orgId)).get()
  if (!wallet) {
    const now = new Date().toISOString()
    wallet = db.insert(creditWallets).values({
      organizationId: orgId,
      balance: 0,
      updatedAt: now,
    }).returning().get()
  }
  return wallet
}

/**
 * Get wallet by organization ID.
 */
export async function getWallet(orgId: number): Promise<WalletData> {
  return getOrCreateWallet(orgId)
}

/**
 * Get transactions for an organization.
 */
export async function getTransactions(orgId: number, limit: number = 50): Promise<TransactionData[]> {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.organizationId, orgId))
    .orderBy(desc(creditTransactions.createdAt), desc(creditTransactions.id))
    .limit(limit)
    .all()
}

/**
 * Deduct credit using atomic conditional update (balance >= amount).
 * Throws an error if balance is insufficient or deduction fails.
 */
export async function deductCredit(
  orgId: number,
  amount: number,
  type: string,
  description?: string
): Promise<{ success: boolean; newBalance: number; transaction: TransactionData }> {
  if (amount <= 0) {
    throw new Error('Deduction amount must be greater than 0')
  }

  // Ensure wallet exists
  await getOrCreateWallet(orgId)
  const now = new Date().toISOString()

  // Use a transaction on sqlite to atomically update and write ledger
  const tx = sqlite.transaction(() => {
    // Atomic conditional update
    const updateStmt = sqlite.prepare(`
      UPDATE credit_wallets 
      SET balance = balance - ?, updated_at = ?
      WHERE organization_id = ? AND balance >= ?
    `)
    const result = updateStmt.run(amount, now, orgId, amount)

    if (result.changes === 0) {
      throw new Error('Insufficient credit balance')
    }

    // Retrieve updated balance & wallet id
    const getStmt = sqlite.prepare(`
      SELECT id, balance FROM credit_wallets WHERE organization_id = ?
    `)
    const updatedWallet = getStmt.get(orgId) as { id: number; balance: number }

    // Insert transaction ledger record
    const insertTxStmt = sqlite.prepare(`
      INSERT INTO credit_transactions (wallet_id, organization_id, amount, type, description, balance_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    const txRecord = insertTxStmt.get(
      updatedWallet.id,
      orgId,
      -Math.abs(amount),
      type,
      description ?? null,
      updatedWallet.balance,
      now
    ) as any

    return {
      newBalance: updatedWallet.balance,
      transaction: mapTransactionRow(txRecord),
    }
  })

  const res = tx()
  return {
    success: true,
    newBalance: res.newBalance,
    transaction: res.transaction,
  }
}

/**
 * Add credit to an organization's wallet.
 */
export async function addCredit(
  orgId: number,
  amount: number,
  type: string,
  description?: string
): Promise<{ success: boolean; newBalance: number; transaction: TransactionData }> {
  if (amount <= 0) {
    throw new Error('Credit amount must be greater than 0')
  }

  await getOrCreateWallet(orgId)
  const now = new Date().toISOString()

  const tx = sqlite.transaction(() => {
    const updateStmt = sqlite.prepare(`
      UPDATE credit_wallets 
      SET balance = balance + ?, updated_at = ?
      WHERE organization_id = ?
    `)
    updateStmt.run(amount, now, orgId)

    const getStmt = sqlite.prepare(`
      SELECT id, balance FROM credit_wallets WHERE organization_id = ?
    `)
    const updatedWallet = getStmt.get(orgId) as { id: number; balance: number }

    const insertTxStmt = sqlite.prepare(`
      INSERT INTO credit_transactions (wallet_id, organization_id, amount, type, description, balance_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    const txRecord = insertTxStmt.get(
      updatedWallet.id,
      orgId,
      Math.abs(amount),
      type,
      description ?? null,
      updatedWallet.balance,
      now
    ) as any

    return {
      newBalance: updatedWallet.balance,
      transaction: mapTransactionRow(txRecord),
    }
  })

  const res = tx()
  return {
    success: true,
    newBalance: res.newBalance,
    transaction: res.transaction,
  }
}
