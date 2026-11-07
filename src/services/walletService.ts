import { db } from '../db'
import { creditWallets, creditTransactions } from '../db/schema'
import { eq, desc, and, gte, sql } from 'drizzle-orm'
import { isCorruptedFileError } from './aiScreeningService'

export interface WalletData {
  id: number
  organizationId: number
  balance: number
  updatedAt: string
}

export type CreditTransactionType =
  | 'INITIAL_GRANT'
  | 'TRIAL_GRANT'
  | 'PURCHASE'
  | 'CV_SCREENING'
  | 'RESERVED'
  | 'SETTLED'
  | 'REFUND'
  | 'REFUND_CORRUPTED_FILE'
  | 'REFUND_PROCESSING_ERROR'
  | 'SUPERADMIN_ADJUSTMENT'

export interface TransactionData {
  id: number
  walletId: number
  organizationId: number
  amount: number
  type: CreditTransactionType
  description: string | null
  balanceAfter: number
  createdAt: string
}

function mapTransactionRow(row: {
  id: number
  walletId: number
  organizationId: number
  amount: number
  type: string
  description: string | null
  balanceAfter: number
  createdAt: string
}): TransactionData {
  return {
    id: row.id,
    walletId: row.walletId,
    organizationId: row.organizationId,
    amount: row.amount,
    type: row.type as CreditTransactionType,
    description: row.description,
    balanceAfter: row.balanceAfter,
    createdAt: row.createdAt,
  }
}

/**
 * Ensures a wallet exists for the given organization.
 * Safe to call concurrently: the unique organization_id constraint decides the
 * winner and the loser re-reads the row.
 */
export async function getOrCreateWallet(orgId: number): Promise<WalletData> {
  const existingList = await db
    .select()
    .from(creditWallets)
    .where(eq(creditWallets.organizationId, orgId))
    .all()

  if (existingList.length > 0) {
    return existingList[0]
  }

  const now = new Date().toISOString()
  await db
    .insert(creditWallets)
    .values({ organizationId: orgId, balance: 0, updatedAt: now })
    .onConflictDoNothing()

  const createdList = await db
    .select()
    .from(creditWallets)
    .where(eq(creditWallets.organizationId, orgId))
    .all()

  if (createdList.length === 0) {
    throw new Error(`Gagal membuat dompet kredit untuk organisasi ${orgId}`)
  }

  return createdList[0]
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
 * Deduct credit using an atomic conditional update (balance >= amount).
 * Works identically on Cloudflare D1 and local SQLite because it relies only on
 * the Drizzle query builder, never on a runtime-specific transaction primitive.
 */
export async function deductCredit(
  orgId: number,
  amount: number,
  type: CreditTransactionType,
  description?: string,
): Promise<{ success: boolean; newBalance: number; transaction: TransactionData }> {
  if (amount <= 0) {
    throw new Error('Deduction amount must be greater than 0')
  }

  await getOrCreateWallet(orgId)
  const now = new Date().toISOString()

  const updatedWallets = await db
    .update(creditWallets)
    .set({
      balance: sql`${creditWallets.balance} - ${amount}`,
      updatedAt: now,
    })
    .where(and(eq(creditWallets.organizationId, orgId), gte(creditWallets.balance, amount)))
    .returning()
    .all()

  if (updatedWallets.length === 0) {
    throw new Error('Insufficient credit balance')
  }

  const wallet = updatedWallets[0]

  const inserted = await db
    .insert(creditTransactions)
    .values({
      walletId: wallet.id,
      organizationId: orgId,
      amount: -Math.abs(amount),
      type,
      description: description ?? null,
      balanceAfter: wallet.balance,
      createdAt: now,
    })
    .returning()
    .get()

  return {
    success: true,
    newBalance: wallet.balance,
    transaction: mapTransactionRow(inserted),
  }
}

/**
 * Reserve credit conditionally (balance >= amount) and log a ledger transaction with type 'RESERVED'.
 * Deducts amount from balance immediately. Throws error if balance is insufficient.
 */
export async function reserveCredit(
  orgId: number,
  amount: number,
  description?: string,
): Promise<{ success: boolean; newBalance: number; transaction: TransactionData }> {
  return deductCredit(orgId, amount, 'RESERVED', description ?? `Reserve credit for processing`)
}

/**
 * Finalizes deduction after reservation.
 * Since reservation already debited the balance, commitCredit settles the
 * reservation with an amount-0 audit row so the balance is never debited twice.
 */
export async function commitCredit(
  orgId: number,
  reservationRef?: string,
  description?: string,
  _deprecatedAmount?: number,
): Promise<{ success: boolean; newBalance: number; transaction: TransactionData }> {
  const wallet = await getOrCreateWallet(orgId)
  const now = new Date().toISOString()
  const descText =
    description ||
    (reservationRef ? `Settled screening (Ref: ${reservationRef})` : `Komitmen screening CV selesai`)

  const inserted = await db
    .insert(creditTransactions)
    .values({
      walletId: wallet.id,
      organizationId: orgId,
      amount: 0,
      type: 'SETTLED',
      description: descText,
      balanceAfter: wallet.balance,
      createdAt: now,
    })
    .returning()
    .get()

  return {
    success: true,
    newBalance: wallet.balance,
    transaction: mapTransactionRow(inserted),
  }
}

/**
 * Unit-of-work helper that executes an action inside an atomic reserve-settle-refund credit lifecycle.
 * Atomically reserves `cost` credits, runs `action()`, commits settlement on success,
 * or issues an automatic refund if an error occurs.
 */
export async function executeMetered<T>(
  orgId: number,
  cost: number,
  description: string,
  action: () => Promise<T>,
): Promise<{ result: T; transaction: TransactionData }> {
  const reservation = await reserveCredit(orgId, cost, description)

  try {
    const result = await action()
    const committed = await commitCredit(orgId, String(reservation.transaction.id), description)
    return {
      result,
      transaction: committed.transaction,
    }
  } catch (error: any) {
    const isCorrupt = isCorruptedFileError(error)

    const refundReason: CreditTransactionType = isCorrupt
      ? 'REFUND_CORRUPTED_FILE'
      : 'REFUND_PROCESSING_ERROR'

    const refundDescription = isCorrupt
      ? `Refund ${cost} credit: file CV rusak atau tidak terbaca`
      : `Refund ${cost} credit: error pemrosesan (${error?.message || 'unknown error'})`

    try {
      await refundCredit(orgId, cost, refundReason, refundDescription)
    } catch (refundErr) {
      console.error(`[executeMetered] Failed to execute refund for org ${orgId}:`, refundErr)
    }

    throw error
  }
}

/**
 * Refund credit back to the organization wallet and log the ledger entry.
 */
export async function refundCredit(
  orgId: number,
  amount: number,
  reason: CreditTransactionType = 'REFUND',
  description?: string,
): Promise<{ success: boolean; newBalance: number; transaction: TransactionData }> {
  const descText = description || `Refund credit: ${reason}`
  return addCredit(orgId, amount, reason, descText)
}

/**
 * Add credit to an organization's wallet.
 */
export async function addCredit(
  orgId: number,
  amount: number,
  type: CreditTransactionType,
  description?: string,
): Promise<{ success: boolean; newBalance: number; transaction: TransactionData }> {
  if (amount <= 0) {
    throw new Error('Credit amount must be greater than 0')
  }

  await getOrCreateWallet(orgId)
  const now = new Date().toISOString()

  const updatedWallets = await db
    .update(creditWallets)
    .set({
      balance: sql`${creditWallets.balance} + ${amount}`,
      updatedAt: now,
    })
    .where(eq(creditWallets.organizationId, orgId))
    .returning()
    .all()

  if (updatedWallets.length === 0) {
    throw new Error(`Dompet kredit untuk organisasi ${orgId} tidak ditemukan`)
  }

  const wallet = updatedWallets[0]

  const inserted = await db
    .insert(creditTransactions)
    .values({
      walletId: wallet.id,
      organizationId: orgId,
      amount: Math.abs(amount),
      type,
      description: description ?? null,
      balanceAfter: wallet.balance,
      createdAt: now,
    })
    .returning()
    .get()

  return {
    success: true,
    newBalance: wallet.balance,
    transaction: mapTransactionRow(inserted),
  }
}
