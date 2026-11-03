import * as schema from './schema'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'

// Global container for Cloudflare D1 instance or fallback
let currentDb: any = null
let currentSqlite: any = null

export function initCloudflareD1(d1Instance: any) {
  if (d1Instance) {
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
        // Return dummy/noop handler in worker environment
        return () => {}
      }
    }
    const val = currentSqlite[prop]
    return typeof val === 'function' ? val.bind(currentSqlite) : val
  }
})
