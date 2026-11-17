import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'
import { openStore } from './db.mjs'

const { Pool } = pg

export async function createIsolatedTestDatabase() {
  const connectionString = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('Configure DATABASE_URL ou DATABASE_URL_TEST antes de executar test:server.')
  }
  const schema = `peritsec_test_${process.pid}_${randomUUID().replace(/-/g, '')}`
  const dataDir = mkdtempSync(join(tmpdir(), 'peritsec-pg-test-'))
  const adminPool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 1_500,
  })
  try {
    await adminPool.query('SELECT 1')
    await adminPool.query(`CREATE SCHEMA "${schema}"`)
  } catch (error) {
    await adminPool.end()
    rmSync(dataDir, { recursive: true, force: true })
    throw new Error(
      `PostgreSQL de teste indisponível ou sem permissão para criar schema (${error?.code ?? 'ERROR'}).`,
    )
  }

  let cleaned = false
  return {
    schema,
    connectionString,
    dataDir,
    async openStore() {
      return openStore({ connectionString, schema, dataDir })
    },
    async cleanup() {
      if (cleaned) return
      cleaned = true
      try {
        await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      } finally {
        await adminPool.end()
        rmSync(dataDir, { recursive: true, force: true })
      }
    },
  }
}
