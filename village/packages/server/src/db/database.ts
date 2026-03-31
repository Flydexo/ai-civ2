import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { SCHEMA_SQL } from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../village.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDb(): void {
  const database = getDb()
  database.exec(SCHEMA_SQL)
  console.log('[DB] Schema initialized')
}
