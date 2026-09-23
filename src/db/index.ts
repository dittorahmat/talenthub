import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'
import { mkdirSync } from 'node:fs'

mkdirSync('data', { recursive: true })
const sqlite = new Database('data/talenthub.db')
// Enable foreign keys
sqlite.exec('PRAGMA foreign_keys = ON;')

export const db = drizzle(sqlite, { schema })
export { sqlite }
