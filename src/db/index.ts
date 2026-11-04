import * as schema from './schema'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'

// Global container for Cloudflare D1 instance or fallback
let currentDb: any = null
let currentSqlite: any = null
let initializedD1Instance: D1Database | null = null

export function initCloudflareD1(d1Instance: D1Database) {
  if (d1Instance && d1Instance !== initializedD1Instance) {
    initializedD1Instance = d1Instance
    currentDb = drizzleD1(d1Instance, { schema })
  }
}

// Transparent getter/proxy
export const db: any = new Proxy({}, {
  get(_target, prop) {
    if (!currentDb) {
      try {
        // Use string concatenation so esbuild does not statically analyze "bun:sqlite" during worker bundling
        const bunSqlitePkg = 'bun' + ':sqlite'
        const drizzleBunPkg = 'drizzle-orm/' + 'bun-sqlite'
        const { drizzle: drizzleBun } = require(drizzleBunPkg)
        const { Database } = require(bunSqlitePkg)
        if (!currentSqlite) {
          const { mkdirSync } = require('node:fs')
          mkdirSync('data', { recursive: true })
          currentSqlite = new Database('data/talenthub.db')
          currentSqlite.exec('PRAGMA foreign_keys = ON;')
        }
        currentDb = drizzleBun(currentSqlite, { schema })
      } catch (e) {
        throw new Error('Database not initialized with Cloudflare D1 or Bun SQLite: ' + (e as any)?.message)
      }
    }
    return currentDb[prop]
  }
})

export const sqlite: any = new Proxy({}, {
  get(_target, prop) {
    if (!currentSqlite) {
      try {
        const bunSqlitePkg = 'bun' + ':sqlite'
        const { Database } = require(bunSqlitePkg)
        const { mkdirSync } = require('node:fs')
        mkdirSync('data', { recursive: true })
        currentSqlite = new Database('data/talenthub.db')
        currentSqlite.exec('PRAGMA foreign_keys = ON;')
      } catch (e) {
        // Raw sqlite access is Bun-only. Fail loudly instead of returning a
        // silent no-op, so a D1 deployment cannot appear to succeed while
        // writing nothing.
        throw new Error(
          'Bun SQLite tidak tersedia di runtime ini. Gunakan Drizzle query builder (db) agar kompatibel dengan Cloudflare D1.',
        )
      }
    }
    const val = currentSqlite[prop]
    return typeof val === 'function' ? val.bind(currentSqlite) : val
  }
})
